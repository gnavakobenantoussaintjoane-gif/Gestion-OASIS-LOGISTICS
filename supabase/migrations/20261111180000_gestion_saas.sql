-- Keep the original (empty at migration time) prototype tables, including their policies.
ALTER TABLE public.trucks RENAME TO legacy_trucks;
ALTER TABLE public.trips RENAME TO legacy_trips;
ALTER TABLE public.expenses RENAME TO legacy_expenses;
CREATE TABLE public.companies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK(length(btrim(name)) BETWEEN 2 AND 100), phone text, address text, logo_path text, currency text NOT NULL DEFAULT 'XOF' CHECK(currency='XOF'), timezone text NOT NULL DEFAULT 'Africa/Abidjan' CHECK(timezone='Africa/Abidjan'), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, company_id uuid NOT NULL REFERENCES public.companies(id), full_name text NOT NULL CHECK(length(btrim(full_name)) BETWEEN 2 AND 100), phone text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,id));
CREATE TABLE public.user_roles (user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, company_id uuid NOT NULL, role text NOT NULL CHECK(role IN ('admin','manager','operator','driver')), FOREIGN KEY(company_id,user_id) REFERENCES public.profiles(company_id,id));
CREATE FUNCTION public.gestion_company() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT company_id FROM public.profiles WHERE id=(SELECT auth.uid()) $$;
CREATE FUNCTION public.gestion_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT role FROM public.user_roles WHERE user_id=(SELECT auth.uid()) $$;
CREATE TABLE public.drivers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), user_id uuid, first_name text NOT NULL, last_name text NOT NULL, phone text NOT NULL, address text, license_number text NOT NULL, license_expiry date NOT NULL, status text NOT NULL DEFAULT 'Actif' CHECK(status IN ('Actif','Inactif')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,id), UNIQUE(company_id,license_number), FOREIGN KEY(company_id,user_id) REFERENCES public.profiles(company_id,id));
CREATE TABLE public.trucks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), plate text NOT NULL, brand text NOT NULL, model text NOT NULL, year integer NOT NULL CHECK(year BETWEEN 1950 AND 2200), chassis text, driver_id uuid, status text NOT NULL DEFAULT 'Disponible' CHECK(status IN ('Disponible','En voyage','En maintenance','Hors service')), description text, archived boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,id), FOREIGN KEY(company_id,driver_id) REFERENCES public.drivers(company_id,id));
CREATE UNIQUE INDEX gestion_truck_plate ON public.trucks(company_id,upper(btrim(plate)));
CREATE TABLE public.terminals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), code text NOT NULL, name text NOT NULL, active boolean NOT NULL DEFAULT true, UNIQUE(company_id,id), UNIQUE(company_id,code));
CREATE TABLE public.container_types (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), name text NOT NULL, kind text NOT NULL CHECK(kind IN ('20_DRY','40_DRY','40_REEFER')), active boolean NOT NULL DEFAULT true, UNIQUE(company_id,id), UNIQUE(company_id,kind));
CREATE TABLE public.shift_definitions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), code text NOT NULL CHECK(code IN ('day','night')), name text NOT NULL, start_time time NOT NULL, end_time time NOT NULL, UNIQUE(company_id,id), UNIQUE(company_id,code));
CREATE TABLE public.expense_categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), name text NOT NULL, active boolean NOT NULL DEFAULT true, UNIQUE(company_id,id), UNIQUE(company_id,name));
CREATE TABLE public.tariff_rules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), terminal_id uuid NOT NULL, container_type_id uuid NOT NULL, load text NOT NULL CHECK(load IN ('Plein','Vide')), shift text NOT NULL CHECK(shift IN ('day','night')), price bigint NOT NULL CHECK(price BETWEEN 1 AND 1000000000000), active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,id), FOREIGN KEY(company_id,terminal_id) REFERENCES public.terminals(company_id,id), FOREIGN KEY(company_id,container_type_id) REFERENCES public.container_types(company_id,id));
CREATE UNIQUE INDEX gestion_active_tariff ON public.tariff_rules(company_id,terminal_id,container_type_id,load,shift) WHERE active;
CREATE TABLE public.trips (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), reference text NOT NULL DEFAULT ('V-'||upper(substr(gen_random_uuid()::text,1,8))), truck_id uuid NOT NULL, driver_id uuid NOT NULL, occurred_at timestamptz NOT NULL, accounting_date date NOT NULL, shift text NOT NULL CHECK(shift IN ('day','night')), terminal_id uuid NOT NULL, container_type_id uuid NOT NULL, load text NOT NULL CHECK(load IN ('Plein','Vide')), tariff_rule_id uuid NOT NULL, price bigint NOT NULL CHECK(price BETWEEN 1 AND 1000000000000), observations text, created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,id), UNIQUE(company_id,reference), UNIQUE(company_id,truck_id,occurred_at,terminal_id,container_type_id,load), FOREIGN KEY(company_id,truck_id) REFERENCES public.trucks(company_id,id), FOREIGN KEY(company_id,driver_id) REFERENCES public.drivers(company_id,id), FOREIGN KEY(company_id,terminal_id) REFERENCES public.terminals(company_id,id), FOREIGN KEY(company_id,container_type_id) REFERENCES public.container_types(company_id,id), FOREIGN KEY(company_id,tariff_rule_id) REFERENCES public.tariff_rules(company_id,id));
CREATE TABLE public.expenses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), reference text NOT NULL DEFAULT ('D-'||upper(substr(gen_random_uuid()::text,1,8))), date date NOT NULL, amount bigint NOT NULL CHECK(amount BETWEEN 1 AND 1000000000000), category_id uuid NOT NULL, description text NOT NULL CHECK(length(btrim(description)) BETWEEN 1 AND 500), truck_id uuid, driver_id uuid, trip_id uuid, shift text CHECK(shift IN ('day','night')), receipt_path text, created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,id), UNIQUE(company_id,reference), FOREIGN KEY(company_id,category_id) REFERENCES public.expense_categories(company_id,id), FOREIGN KEY(company_id,truck_id) REFERENCES public.trucks(company_id,id), FOREIGN KEY(company_id,driver_id) REFERENCES public.drivers(company_id,id), FOREIGN KEY(company_id,trip_id) REFERENCES public.trips(company_id,id) ON DELETE SET NULL(trip_id));
CREATE TABLE public.notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), user_id uuid NOT NULL REFERENCES auth.users(id), title text NOT NULL, message text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), user_id uuid REFERENCES auth.users(id), action text NOT NULL, entity text NOT NULL, entity_id uuid NOT NULL, old_data jsonb, new_data jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION public.gestion_prepare_trip() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE local_time timestamp; rule public.tariff_rules; BEGIN
 local_time := NEW.occurred_at AT TIME ZONE 'Africa/Abidjan';
 IF local_time::time >= '06:00' AND local_time::time <= '18:30' THEN NEW.shift:='day'; NEW.accounting_date:=local_time::date;
 ELSIF local_time::time >= '19:00' THEN NEW.shift:='night'; NEW.accounting_date:=local_time::date;
 ELSIF local_time::time < '06:00' THEN NEW.shift:='night'; NEW.accounting_date:=local_time::date-1;
 ELSE RAISE EXCEPTION 'Hors shift (18h30-19h00)' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' OR (NEW.tariff_rule_id,NEW.terminal_id,NEW.container_type_id,NEW.load,NEW.shift) IS DISTINCT FROM (OLD.tariff_rule_id,OLD.terminal_id,OLD.container_type_id,OLD.load,OLD.shift) THEN
 SELECT * INTO rule FROM public.tariff_rules WHERE id=NEW.tariff_rule_id AND company_id=NEW.company_id AND active;
 IF NOT FOUND OR (rule.terminal_id,rule.container_type_id,rule.load,rule.shift) IS DISTINCT FROM (NEW.terminal_id,NEW.container_type_id,NEW.load,NEW.shift) THEN RAISE EXCEPTION 'Tarif actif correspondant requis' USING ERRCODE='23514'; END IF;
 NEW.price:=rule.price;
 ELSE NEW.price:=OLD.price; END IF;
 IF TG_OP='UPDATE' THEN NEW.created_by:=OLD.created_by; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER gestion_trip_prepare BEFORE INSERT OR UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.gestion_prepare_trip();
CREATE FUNCTION public.gestion_prepare_expense() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ DECLARE t public.trips; BEGIN
 IF NEW.trip_id IS NOT NULL THEN SELECT * INTO t FROM public.trips WHERE id=NEW.trip_id AND company_id=NEW.company_id; IF NOT FOUND THEN RAISE EXCEPTION 'Voyage invalide' USING ERRCODE='23503'; END IF; NEW.truck_id:=t.truck_id; NEW.driver_id:=t.driver_id; NEW.shift:=t.shift; END IF;
 IF TG_OP='UPDATE' THEN NEW.created_by:=OLD.created_by; END IF; RETURN NEW; END $$;
CREATE TRIGGER gestion_expense_prepare BEFORE INSERT OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.gestion_prepare_expense();
CREATE FUNCTION public.gestion_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE r jsonb; BEGIN
 r:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 INSERT INTO public.audit_logs(company_id,user_id,action,entity,entity_id,old_data,new_data) VALUES ((r->>'company_id')::uuid,auth.uid(),TG_OP,TG_TABLE_NAME,(r->>'id')::uuid,CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD) END,CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW) END);
 IF auth.uid() IS NOT NULL THEN INSERT INTO public.notifications(company_id,user_id,title,message) VALUES ((r->>'company_id')::uuid,auth.uid(),CASE TG_OP WHEN 'INSERT' THEN 'Nouvelle opération' WHEN 'UPDATE' THEN 'Opération modifiée' ELSE 'Opération supprimée' END,TG_TABLE_NAME||' · '||coalesce(r->>'reference',r->>'plate',r->>'name',r->>'id')); END IF;
 RETURN COALESCE(NEW,OLD); END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['companies','profiles','drivers','trucks','tariff_rules','trips','expenses'] LOOP EXECUTE format('CREATE TRIGGER gestion_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.oasis_set_updated_at()',t); END LOOP;
 FOREACH t IN ARRAY ARRAY['drivers','trucks','tariff_rules','trips','expenses'] LOOP EXECUTE format('CREATE TRIGGER gestion_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.gestion_audit()',t); END LOOP;
 FOREACH t IN ARRAY ARRAY['companies','profiles','user_roles','drivers','trucks','terminals','container_types','shift_definitions','expense_categories','tariff_rules','trips','expenses','notifications','audit_logs'] LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t); EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t); END LOOP;
 FOREACH t IN ARRAY ARRAY['terminals','container_types','shift_definitions','expense_categories','tariff_rules'] LOOP
 EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
 EXECUTE format('CREATE POLICY company_read ON public.%I FOR SELECT TO authenticated USING(company_id=public.gestion_company() AND public.gestion_role() IN (''admin'',''manager'',''operator''))',t);
 EXECUTE format('CREATE POLICY admin_write ON public.%I FOR ALL TO authenticated USING(company_id=public.gestion_company() AND public.gestion_role()=''admin'') WITH CHECK(company_id=public.gestion_company() AND public.gestion_role()=''admin'')',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['trucks','drivers'] LOOP
 EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
 EXECUTE format('CREATE POLICY operations_read ON public.%I FOR SELECT TO authenticated USING(company_id=public.gestion_company() AND public.gestion_role() IN (''admin'',''manager'',''operator''))',t);
 EXECUTE format('CREATE POLICY managers_write ON public.%I FOR ALL TO authenticated USING(company_id=public.gestion_company() AND public.gestion_role() IN (''admin'',''manager'')) WITH CHECK(company_id=public.gestion_company() AND public.gestion_role() IN (''admin'',''manager''))',t);
 END LOOP;
END $$;
GRANT SELECT,UPDATE ON public.companies TO authenticated;
CREATE POLICY company_read ON public.companies FOR SELECT TO authenticated USING(id=public.gestion_company());
CREATE POLICY company_update ON public.companies FOR UPDATE TO authenticated USING(id=public.gestion_company() AND public.gestion_role()='admin') WITH CHECK(id=public.gestion_company() AND public.gestion_role()='admin');
GRANT SELECT ON public.profiles,public.user_roles TO authenticated;
GRANT UPDATE(full_name,phone) ON public.profiles TO authenticated;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid() OR (company_id=public.gestion_company() AND public.gestion_role() IN ('admin','manager')));
CREATE POLICY profile_self ON public.profiles FOR UPDATE TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());
CREATE POLICY roles_read ON public.user_roles FOR SELECT TO authenticated USING(company_id=public.gestion_company());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.trips,public.expenses TO authenticated;
CREATE POLICY trips_read ON public.trips FOR SELECT TO authenticated USING(company_id=public.gestion_company() AND (public.gestion_role() IN ('admin','manager','operator') OR EXISTS(SELECT 1 FROM public.drivers d WHERE d.id=driver_id AND d.user_id=auth.uid())));
CREATE POLICY driver_self ON public.drivers FOR SELECT TO authenticated USING(company_id=public.gestion_company() AND user_id=auth.uid());
CREATE POLICY trips_insert ON public.trips FOR INSERT TO authenticated WITH CHECK(company_id=public.gestion_company() AND created_by=auth.uid() AND public.gestion_role() IN ('admin','manager','operator'));
CREATE POLICY trips_update ON public.trips FOR UPDATE TO authenticated USING(company_id=public.gestion_company() AND (public.gestion_role() IN ('admin','manager') OR (public.gestion_role()='operator' AND created_by=auth.uid()))) WITH CHECK(company_id=public.gestion_company() AND (public.gestion_role() IN ('admin','manager') OR (public.gestion_role()='operator' AND created_by=auth.uid())));
CREATE POLICY trips_delete ON public.trips FOR DELETE TO authenticated USING(company_id=public.gestion_company() AND public.gestion_role() IN ('admin','manager'));
CREATE POLICY expenses_manage ON public.expenses FOR ALL TO authenticated USING(company_id=public.gestion_company() AND public.gestion_role() IN ('admin','manager')) WITH CHECK(company_id=public.gestion_company() AND public.gestion_role() IN ('admin','manager') AND created_by=auth.uid());
GRANT SELECT ON public.audit_logs,public.notifications TO authenticated;
GRANT UPDATE(read_at) ON public.notifications TO authenticated;
CREATE POLICY audits_read ON public.audit_logs FOR SELECT TO authenticated USING(company_id=public.gestion_company() AND public.gestion_role() IN ('admin','manager'));
CREATE POLICY notifications_self ON public.notifications FOR SELECT TO authenticated USING(user_id=auth.uid() AND company_id=public.gestion_company());
CREATE POLICY notifications_mark ON public.notifications FOR UPDATE TO authenticated USING(user_id=auth.uid() AND company_id=public.gestion_company()) WITH CHECK(user_id=auth.uid() AND company_id=public.gestion_company());
CREATE FUNCTION public.gestion_create_company(company_name text,display_name text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE c uuid; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid()) THEN RAISE EXCEPTION 'Compte déjà rattaché'; END IF;
 INSERT INTO public.companies(name) VALUES(company_name) RETURNING id INTO c;
 INSERT INTO public.profiles(id,company_id,full_name) VALUES(auth.uid(),c,display_name);
 INSERT INTO public.user_roles(user_id,company_id,role) VALUES(auth.uid(),c,'admin');
 INSERT INTO public.terminals(company_id,code,name) VALUES(c,'ATL','Abidjan Terminal'),(c,'CIT','Côte d’Ivoire Terminal');
 INSERT INTO public.container_types(company_id,name,kind) VALUES(c,'20 pieds DRY','20_DRY'),(c,'40 pieds DRY','40_DRY'),(c,'40 pieds REEFER','40_REEFER');
 INSERT INTO public.shift_definitions(company_id,code,name,start_time,end_time) VALUES(c,'day','Jour','06:00','18:30'),(c,'night','Soir','19:00','06:00');
 INSERT INTO public.expense_categories(company_id,name) SELECT c,unnest(ARRAY['Carburant','Réparation','Entretien','Pneumatiques','Péage','Frais de route','Manutention','Salaires','Assurance','Frais administratifs','Autres']);
 RETURN c; END $$;
CREATE FUNCTION public.gestion_set_member(member_email text,member_name text,member_role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE u uuid;c uuid; BEGIN
 c:=public.gestion_company(); IF public.gestion_role()<>'admin' OR c IS NULL THEN RAISE EXCEPTION 'Administrateur requis'; END IF;
 IF member_role NOT IN ('admin','manager','operator','driver') THEN RAISE EXCEPTION 'Rôle invalide'; END IF;
 SELECT id INTO u FROM auth.users WHERE lower(email)=lower(member_email) AND email_confirmed_at IS NOT NULL;
 IF u IS NULL THEN RAISE EXCEPTION 'Le membre doit créer et confirmer son compte avant son rattachement'; END IF;
 IF u=auth.uid() THEN RAISE EXCEPTION 'Ne modifiez pas votre propre rôle'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=u AND company_id<>c) THEN RAISE EXCEPTION 'Membre déjà rattaché à une entreprise'; END IF;
 INSERT INTO public.profiles(id,company_id,full_name) VALUES(u,c,member_name) ON CONFLICT(id) DO UPDATE SET full_name=excluded.full_name;
 INSERT INTO public.user_roles(user_id,company_id,role) VALUES(u,c,member_role) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role;
 INSERT INTO public.audit_logs(company_id,user_id,action,entity,entity_id,new_data) VALUES(c,auth.uid(),'MEMBERSHIP','user_roles',u,jsonb_build_object('role',member_role));
 END $$;
REVOKE EXECUTE ON FUNCTION public.gestion_company(),public.gestion_role(),public.gestion_prepare_trip(),public.gestion_prepare_expense(),public.gestion_audit(),public.gestion_create_company(text,text),public.gestion_set_member(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gestion_company(),public.gestion_role(),public.gestion_create_company(text,text),public.gestion_set_member(text,text,text) TO authenticated;
CREATE INDEX gestion_trip_date ON public.trips(company_id,accounting_date DESC);
CREATE INDEX gestion_expense_date ON public.expenses(company_id,date DESC);
CREATE INDEX gestion_notification_user ON public.notifications(user_id,created_at DESC);
CREATE INDEX gestion_audit_company ON public.audit_logs(company_id,created_at DESC);
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('gestion-receipts','gestion-receipts',false,5242880,ARRAY['application/pdf','image/jpeg','image/png']) ON CONFLICT(id) DO NOTHING;
CREATE POLICY gestion_receipts_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='gestion-receipts' AND (storage.foldername(name))[1]=public.gestion_company()::text AND public.gestion_role() IN ('admin','manager'));
CREATE POLICY gestion_receipts_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='gestion-receipts' AND (storage.foldername(name))[1]=public.gestion_company()::text AND public.gestion_role() IN ('admin','manager'));
CREATE POLICY gestion_receipts_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='gestion-receipts' AND (storage.foldername(name))[1]=public.gestion_company()::text AND public.gestion_role() IN ('admin','manager'));
