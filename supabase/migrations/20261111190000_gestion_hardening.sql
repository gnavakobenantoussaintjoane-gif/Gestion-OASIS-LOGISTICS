-- Managers may edit another manager's expense; creator is immutable on update.
DROP POLICY expenses_manage ON public.expenses;
CREATE POLICY expenses_read ON public.expenses FOR SELECT TO authenticated USING(company_id=public.gestion_company() AND public.gestion_role() IN ('admin','manager'));
CREATE POLICY expenses_insert ON public.expenses FOR INSERT TO authenticated WITH CHECK(company_id=public.gestion_company() AND public.gestion_role() IN ('admin','manager') AND created_by=auth.uid());
CREATE POLICY expenses_update ON public.expenses FOR UPDATE TO authenticated USING(company_id=public.gestion_company() AND public.gestion_role() IN ('admin','manager')) WITH CHECK(company_id=public.gestion_company() AND public.gestion_role() IN ('admin','manager'));
CREATE POLICY expenses_delete ON public.expenses FOR DELETE TO authenticated USING(company_id=public.gestion_company() AND public.gestion_role() IN ('admin','manager'));
CREATE POLICY driver_truck_read ON public.trucks FOR SELECT TO authenticated USING(company_id=public.gestion_company() AND EXISTS(SELECT 1 FROM public.drivers d WHERE d.id=driver_id AND d.user_id=auth.uid()));
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['terminals','container_types','shift_definitions'] LOOP EXECUTE format('CREATE POLICY driver_reference_read ON public.%I FOR SELECT TO authenticated USING(company_id=public.gestion_company() AND public.gestion_role()=''driver'')',t); END LOOP; END $$;
-- Operational linkage follows a corrected trip, while amounts/dates stay unchanged.
CREATE FUNCTION public.gestion_sync_trip_expenses() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 UPDATE public.expenses SET truck_id=NEW.truck_id,driver_id=NEW.driver_id,shift=NEW.shift WHERE company_id=NEW.company_id AND trip_id=NEW.id AND (truck_id,driver_id,shift) IS DISTINCT FROM (NEW.truck_id,NEW.driver_id,NEW.shift); RETURN NEW; END $$;
CREATE TRIGGER gestion_sync_trip_expenses AFTER UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.gestion_sync_trip_expenses();
REVOKE EXECUTE ON FUNCTION public.gestion_sync_trip_expenses() FROM PUBLIC,anon,authenticated;
