-- Conteneurs physiques rattachés à une mission (voyage).
-- Un voyage 20 pieds porte exactement deux conteneurs 20 ; un voyage 40 pieds
-- exactement un conteneur 40. Le type tarifaire (20_DRY / 40_DRY / 40_REEFER)
-- reste porté par trips.container_type_id : aucune duplication de la grille.
-- Historical changes are recorded in audit_logs (no silent erasure).

-- 1. Validation ISO 6346 (4 lettres + 6 chiffres + clé de contrôle).
create or replace function public.gestion_iso6346_valid(value text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  s text := upper(btrim(coalesce(value, '')));
  letters text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  letter_values int[] := array[10,12,13,14,15,16,17,18,19,20,21,23,24,25,26,27,28,29,30,31,32,34,35,36,37,38];
  i int;
  ch text;
  base int;
  total int := 0;
begin
  if s !~ '^[A-Z]{4}[0-9]{7}$' then
    return false;
  end if;
  for i in 1..10 loop
    ch := substr(s, i, 1);
    if ch ~ '[0-9]' then
      base := ch::int;
    else
      base := letter_values[strpos(letters, ch)];
    end if;
    total := total + base * ((2 ^ (i - 1))::int);
  end loop;
  return ((total % 11) % 10) = substr(s, 11, 1)::int;
end;
$$;

-- 2. Table des conteneurs d'une mission.
create table if not exists public.trip_containers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  trip_id uuid not null,
  number text not null,
  size smallint not null check (size in (20, 40)),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_containers_company_id_id_key unique (company_id, id),
  constraint trip_containers_trip_number_key unique (trip_id, number),
  constraint trip_containers_number_iso check (
    number = upper(btrim(number)) and public.gestion_iso6346_valid(number)
  ),
  constraint trip_containers_trip_fkey foreign key (company_id, trip_id)
    references public.trips(company_id, id) on delete cascade
);

create index if not exists trip_containers_company_trip
  on public.trip_containers (company_id, trip_id);
create index if not exists trip_containers_company_number
  on public.trip_containers (company_id, number);

-- 3. Le trigger prépare la ligne avant les contrôles RLS et les contraintes.
create or replace function public.gestion_prepare_trip_container()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_company uuid;
begin
  select company_id into v_company from public.trips where id = NEW.trip_id;
  if v_company is null then
    raise exception 'Mission invalide.' using errcode = '23503';
  end if;
  NEW.company_id := v_company;
  NEW.number := upper(btrim(NEW.number));
  if TG_OP = 'UPDATE' then
    NEW.trip_id := OLD.trip_id;
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
  else
    NEW.created_by := coalesce(NEW.created_by, auth.uid());
    NEW.created_at := coalesce(NEW.created_at, now());
  end if;
  NEW.updated_at := now();
  return NEW;
end;
$$;

create trigger gestion_trip_container_prepare
before insert or update on public.trip_containers
for each row execute function public.gestion_prepare_trip_container();

-- 4. Contrôle différé : la mission et ses conteneurs doivent être cohérents
--    au commit, y compris lorsque la mission est créée puis ses conteneurs
--    insérés dans la même transaction.
create or replace function public.gestion_validate_trip_containers(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
  v_count int;
  v_min smallint;
  v_max smallint;
begin
  select ct.kind into v_kind
  from public.trips t
  join public.container_types ct
    on ct.id = t.container_type_id and ct.company_id = t.company_id
  where t.id = p_trip_id;
  -- Mission supprimée (cascade) ou invisible : rien à valider.
  if v_kind is null then
    return;
  end if;
  select count(*)::int, min(size), max(size)
  into v_count, v_min, v_max
  from public.trip_containers
  where trip_id = p_trip_id;
  if v_kind = '20_DRY' then
    if v_count <> 2 or v_min <> 20 or v_max <> 20 then
      raise exception 'Deux numéros de conteneurs 20 pieds sont obligatoires pour cette mission.'
        using errcode = '23514';
    end if;
  elsif v_kind in ('40_DRY', '40_REEFER') then
    if v_count <> 1 or v_min <> 40 or v_max <> 40 then
      raise exception 'Un seul numéro de conteneur 40 pieds est obligatoire pour cette mission.'
        using errcode = '23514';
    end if;
  else
    raise exception 'Type de conteneur non pris en charge.' using errcode = '23514';
  end if;
end;
$$;

create or replace function public.gestion_container_validate_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'UPDATE' and OLD.trip_id is distinct from NEW.trip_id then
    perform public.gestion_validate_trip_containers(OLD.trip_id);
    perform public.gestion_validate_trip_containers(NEW.trip_id);
  else
    perform public.gestion_validate_trip_containers(coalesce(NEW.trip_id, OLD.trip_id));
  end if;
  return null;
end;
$$;

create constraint trigger gestion_trip_containers_valid
after insert or update or delete on public.trip_containers
deferrable initially deferred
for each row execute function public.gestion_container_validate_trigger();

create or replace function public.gestion_trip_container_required_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.gestion_validate_trip_containers(NEW.id);
  return null;
end;
$$;

create constraint trigger gestion_trip_containers_required
after insert or update of container_type_id on public.trips
deferrable initially deferred
for each row execute function public.gestion_trip_container_required_trigger();

-- 5. Trace des ajouts, modifications et suppressions de numéros.
--    entity_id = mission : l'historique se consulte par mission.
create or replace function public.gestion_audit_trip_container()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  action_name text;
begin
  r := case when TG_OP = 'DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
  action_name := case TG_OP
    when 'INSERT' then 'CONTAINER_ADDED'
    when 'UPDATE' then 'CONTAINER_UPDATED'
    else 'CONTAINER_REMOVED'
  end;
  insert into public.audit_logs(company_id, user_id, action, entity, entity_id, old_data, new_data)
  values (
    (r->>'company_id')::uuid,
    auth.uid(),
    action_name,
    'trip_containers',
    (r->>'trip_id')::uuid,
    case when TG_OP <> 'INSERT' then to_jsonb(OLD) end,
    case when TG_OP <> 'DELETE' then to_jsonb(NEW) end
  );
  return coalesce(NEW, OLD);
end;
$$;

create trigger gestion_trip_containers_audit
after insert or update or delete on public.trip_containers
for each row execute function public.gestion_audit_trip_container();

-- 6. RPC atomique utilisée par POST/PATCH /trips : la mission et ses conteneurs
--    sont écrits dans la même transaction. SECURITY INVOKER : la RLS existante
--    (et les policies ci-dessous) s'appliquent à l'appelant.
create or replace function public.gestion_save_trip(
  p_id uuid,
  p_payload jsonb,
  p_containers jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_trip public.trips;
  v_id uuid;
begin
  if p_id is null then
    v_trip := jsonb_populate_record(null::public.trips, coalesce(p_payload, '{}'::jsonb));
    v_trip.id := gen_random_uuid();
    v_trip.company_id := public.gestion_company();
    v_trip.created_by := auth.uid();
    v_trip.created_at := now();
    v_trip.updated_at := now();
    v_trip.reference := coalesce(
      v_trip.reference,
      'V-' || upper(substr(gen_random_uuid()::text, 1, 8))
    );
    insert into public.trips (
      id, company_id, reference, truck_id, driver_id, occurred_at,
      accounting_date, shift, terminal_id, container_type_id, load,
      tariff_rule_id, price, observations, created_by, created_at, updated_at
    ) values (
      v_trip.id, v_trip.company_id, v_trip.reference, v_trip.truck_id,
      v_trip.driver_id, v_trip.occurred_at, v_trip.accounting_date,
      v_trip.shift, v_trip.terminal_id, v_trip.container_type_id,
      v_trip.load, v_trip.tariff_rule_id, v_trip.price, v_trip.observations,
      v_trip.created_by, v_trip.created_at, v_trip.updated_at
    )
    returning id into v_id;
  else
    select * into v_trip
    from public.trips
    where id = p_id and company_id = public.gestion_company();
    if not found then
      raise exception 'Mission introuvable.' using errcode = 'P0001';
    end if;
    v_trip := jsonb_populate_record(v_trip, coalesce(p_payload, '{}'::jsonb));
    update public.trips set
      truck_id = v_trip.truck_id,
      driver_id = v_trip.driver_id,
      occurred_at = v_trip.occurred_at,
      terminal_id = v_trip.terminal_id,
      container_type_id = v_trip.container_type_id,
      load = v_trip.load,
      tariff_rule_id = v_trip.tariff_rule_id,
      observations = v_trip.observations
    where id = p_id and company_id = v_trip.company_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Mission introuvable ou non modifiable.' using errcode = '42501';
    end if;
  end if;

  if p_containers is not null then
    delete from public.trip_containers where trip_id = v_id;
    insert into public.trip_containers (company_id, trip_id, number, size, created_by)
    select v_trip.company_id, v_id, x->>'number', (x->>'size')::smallint, auth.uid()
    from jsonb_array_elements(p_containers) as x;
  end if;
  return v_id;
end;
$$;

-- 7. RLS et privilèges.
alter table public.trip_containers enable row level security;
revoke all on public.trip_containers from anon, authenticated;
grant select, insert, update, delete on public.trip_containers to authenticated;

create policy trip_containers_read on public.trip_containers
for select to authenticated
using (
  company_id = public.gestion_company()
  and (
    public.gestion_role() in ('admin', 'manager', 'operator')
    or exists (
      select 1
      from public.trips t
      join public.drivers d on d.id = t.driver_id
      where t.id = trip_containers.trip_id
        and d.user_id = auth.uid()
    )
  )
);

create policy trip_containers_write on public.trip_containers
for all to authenticated
using (
  company_id = public.gestion_company()
  and exists (
    select 1
    from public.trips t
    where t.id = trip_containers.trip_id
      and t.company_id = public.gestion_company()
      and (
        public.gestion_role() in ('admin', 'manager')
        or (public.gestion_role() = 'operator' and t.created_by = auth.uid())
      )
  )
)
with check (
  company_id = public.gestion_company()
  and exists (
    select 1
    from public.trips t
    where t.id = trip_containers.trip_id
      and t.company_id = public.gestion_company()
      and (
        public.gestion_role() in ('admin', 'manager')
        or (public.gestion_role() = 'operator' and t.created_by = auth.uid())
      )
  )
);

grant execute on function public.gestion_save_trip(uuid, jsonb, jsonb) to authenticated;
revoke execute on function public.gestion_validate_trip_containers(uuid),
  public.gestion_container_validate_trigger(),
  public.gestion_trip_container_required_trigger(),
  public.gestion_prepare_trip_container(),
  public.gestion_audit_trip_container()
from public, anon, authenticated;

comment on table public.trip_containers is
  'Conteneurs physiques d''une mission : 2 × 20 pieds ou 1 × 40 pieds, numéros ISO 6346.';
