-- Private installation: company provisioning is an administrative operation only.
-- Existing data and company-level RLS are preserved.
REVOKE EXECUTE ON FUNCTION public.gestion_create_company(text,text) FROM PUBLIC, anon, authenticated;
