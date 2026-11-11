CREATE FUNCTION public.gestion_trip_availability() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF TG_OP='INSERT' OR (NEW.truck_id,NEW.driver_id,NEW.terminal_id,NEW.container_type_id) IS DISTINCT FROM (OLD.truck_id,OLD.driver_id,OLD.terminal_id,OLD.container_type_id) THEN
 IF NOT EXISTS(SELECT 1 FROM public.trucks WHERE company_id=NEW.company_id AND id=NEW.truck_id AND NOT archived AND status NOT IN ('En maintenance','Hors service')) THEN RAISE EXCEPTION 'Camion indisponible ou archivé' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.drivers WHERE company_id=NEW.company_id AND id=NEW.driver_id AND status='Actif') THEN RAISE EXCEPTION 'Chauffeur inactif ou invalide' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.terminals WHERE company_id=NEW.company_id AND id=NEW.terminal_id AND active) OR NOT EXISTS(SELECT 1 FROM public.container_types WHERE company_id=NEW.company_id AND id=NEW.container_type_id AND active) THEN RAISE EXCEPTION 'Terminal ou conteneur désactivé' USING ERRCODE='23514'; END IF;
 END IF; RETURN NEW; END $$;
CREATE TRIGGER gestion_trip_availability BEFORE INSERT OR UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.gestion_trip_availability();
REVOKE EXECUTE ON FUNCTION public.gestion_trip_availability() FROM PUBLIC,anon,authenticated;
