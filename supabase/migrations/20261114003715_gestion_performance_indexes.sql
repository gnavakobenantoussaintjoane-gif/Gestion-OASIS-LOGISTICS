-- Index de lecture pour les filtres, les jointures et la RLS.
-- Migration idempotente : peut être rejouée sans modifier les données.
-- À appliquer après les migrations 20261111* ; aucune table n'est modifiée.

create index if not exists trips_company_driver
  on public.trips (company_id, driver_id);

create index if not exists trips_company_terminal
  on public.trips (company_id, terminal_id);

create index if not exists trips_company_container
  on public.trips (company_id, container_type_id);

create index if not exists expenses_company_trip
  on public.expenses (company_id, trip_id);

-- Accélère la lecture « mes missions » du chauffeur et le rattachement compte/chauffeur.
create index if not exists drivers_company_user
  on public.drivers (company_id, user_id);
