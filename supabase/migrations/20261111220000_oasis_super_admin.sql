-- A dedicated, non-user-editable capability; business roles stay compatible with RLS.
CREATE TABLE public.oasis_super_admin (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
 company_id uuid NOT NULL REFERENCES public.companies(id),
 singleton boolean NOT NULL DEFAULT true UNIQUE CHECK(singleton)
);
ALTER TABLE public.oasis_super_admin ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oasis_super_admin FROM anon, authenticated;
CREATE FUNCTION public.oasis_is_super_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.oasis_super_admin s JOIN public.user_roles r ON r.user_id=s.user_id AND r.company_id=s.company_id WHERE s.user_id=auth.uid() AND r.role='admin');
$$;
REVOKE ALL ON FUNCTION public.oasis_is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.oasis_is_super_admin() TO authenticated;

-- Preserve existing membership validation/auditing, but reserve changes to the owner.
ALTER FUNCTION public.gestion_set_member(text,text,text) RENAME TO oasis_set_member_internal;
REVOKE ALL ON FUNCTION public.oasis_set_member_internal(text,text,text) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.gestion_set_member(member_email text,member_name text,member_role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.oasis_is_super_admin() THEN RAISE EXCEPTION 'Super administrateur requis' USING ERRCODE='42501'; END IF;
 PERFORM public.oasis_set_member_internal(member_email,member_name,member_role);
END $$;
REVOKE ALL ON FUNCTION public.gestion_set_member(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gestion_set_member(text,text,text) TO authenticated;

-- One-time provisioning, callable only by a trusted server administrative client.
CREATE FUNCTION public.oasis_bootstrap_owner(owner_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid; existing_owner uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Provisionnement serveur requis' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('oasis-owner-bootstrap',0));
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=owner_id AND lower(email)='gnavakobenan@gmail.com' AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Compte propriétaire confirmé requis'; END IF;
 SELECT user_id,company_id INTO existing_owner,c FROM public.oasis_super_admin LIMIT 1;
 IF existing_owner IS NOT NULL THEN
   IF existing_owner<>owner_id THEN RAISE EXCEPTION 'Un propriétaire existe déjà'; END IF;
   RETURN c;
 END IF;
 SELECT company_id INTO c FROM public.profiles WHERE id=owner_id;
 IF c IS NULL THEN
   IF (SELECT count(*) FROM public.companies WHERE upper(btrim(name))='OASIS LOGISTICS')>1 THEN RAISE EXCEPTION 'Entreprise ambiguë : intervention administrative nécessaire'; END IF;
   SELECT id INTO c FROM public.companies WHERE upper(btrim(name))='OASIS LOGISTICS';
   IF c IS NULL THEN
     INSERT INTO public.companies(name) VALUES('OASIS LOGISTICS') RETURNING id INTO c;
     INSERT INTO public.terminals(company_id,code,name) VALUES(c,'ATL','Abidjan Terminal'),(c,'CIT','Côte d’Ivoire Terminal');
     INSERT INTO public.container_types(company_id,name,kind) VALUES(c,'20 pieds DRY','20_DRY'),(c,'40 pieds DRY','40_DRY'),(c,'40 pieds REEFER','40_REEFER');
     INSERT INTO public.shift_definitions(company_id,code,name,start_time,end_time) VALUES(c,'day','Jour','06:00','18:30'),(c,'night','Soir','19:00','06:00');
     INSERT INTO public.expense_categories(company_id,name) SELECT c,unnest(ARRAY['Carburant','Réparation','Entretien','Pneumatiques','Péage','Frais de route','Manutention','Salaires','Assurance','Frais administratifs','Autres']);
   END IF;
 ELSE
   IF NOT EXISTS(SELECT 1 FROM public.companies WHERE id=c AND upper(btrim(name))='OASIS LOGISTICS') THEN RAISE EXCEPTION 'Propriétaire rattaché à une autre entreprise'; END IF;
 END IF;
 INSERT INTO public.profiles(id,company_id,full_name) VALUES(owner_id,c,'Super administrateur OASIS LOGISTICS') ON CONFLICT(id) DO NOTHING;
 INSERT INTO public.user_roles(user_id,company_id,role) VALUES(owner_id,c,'admin') ON CONFLICT(user_id) DO UPDATE SET role='admin';
 INSERT INTO public.oasis_super_admin(user_id,company_id) VALUES(owner_id,c);
 INSERT INTO public.audit_logs(company_id,user_id,action,entity,entity_id) VALUES(c,owner_id,'SUPER_ADMIN_BOOTSTRAP','user_roles',owner_id);
 RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.oasis_bootstrap_owner(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.oasis_bootstrap_owner(uuid) TO service_role;
