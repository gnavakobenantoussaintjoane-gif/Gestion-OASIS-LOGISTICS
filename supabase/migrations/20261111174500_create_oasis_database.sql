-- OASIS v1: private records per authenticated user; no demo data imported.
CREATE TABLE public.trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plate text NOT NULL CHECK (length(btrim(plate)) BETWEEN 1 AND 30),
  driver text NOT NULL CHECK (length(btrim(driver)) BETWEEN 1 AND 100),
  status text NOT NULL DEFAULT 'Disponible' CHECK (status IN ('Disponible', 'En mission', 'Maintenance')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, id)
);
CREATE UNIQUE INDEX trucks_owner_plate_unique ON public.trucks (owner_id, upper(btrim(plate)));

CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  truck_id uuid NOT NULL,
  shift text NOT NULL CHECK (shift IN ('Jour', 'Nuit')),
  terminal text NOT NULL CHECK (terminal IN ('ATL', 'CIT')),
  container text NOT NULL CHECK (container IN ('20 pieds DRY', '40 pieds DRY', '40 pieds REEFER')),
  load text NOT NULL CHECK (load IN ('Plein', 'Vide')),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 10000),
  price numeric(16,0) NOT NULL CHECK (price > 0 AND price <= 9007199254740991),
  paid numeric(16,0) NOT NULL DEFAULT 0 CHECK (paid >= 0),
  revenue numeric(20,0) GENERATED ALWAYS AS (quantity * price) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trips_valid_amounts CHECK (revenue <= 9007199254740991 AND paid <= revenue),
  CONSTRAINT trips_truck_fk FOREIGN KEY (owner_id, truck_id) REFERENCES public.trucks(owner_id, id) ON DELETE RESTRICT,
  UNIQUE (owner_id, id, truck_id)
);
COMMENT ON COLUMN public.trips.date IS 'Date de départ à Abidjan. Le shift Nuit (19h-06h J+1) appartient à cette date.';
COMMENT ON COLUMN public.trips.paid IS 'Encaissement cumulé rattaché à la date du voyage ; pas un journal bancaire.';
CREATE INDEX trips_owner_date_idx ON public.trips (owner_id, date DESC);
CREATE INDEX trips_owner_truck_idx ON public.trips (owner_id, truck_id);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  truck_id uuid,
  trip_id uuid,
  category text NOT NULL CHECK (category IN ('Carburant', 'Entretien', 'Péage', 'Salaire / prime', 'Manutention', 'Autre')),
  description text NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 200),
  amount numeric(16,0) NOT NULL CHECK (amount > 0 AND amount <= 9007199254740991),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expenses_linked_truck_required CHECK (trip_id IS NULL OR truck_id IS NOT NULL),
  CONSTRAINT expenses_truck_fk FOREIGN KEY (owner_id, truck_id) REFERENCES public.trucks(owner_id, id) ON DELETE RESTRICT,
  -- Composite reference prevents cross-user links and enforces the trip's truck.
  -- Deleting a trip preserves its expenses and their truck association.
  CONSTRAINT expenses_trip_fk FOREIGN KEY (owner_id, trip_id, truck_id)
    REFERENCES public.trips(owner_id, id, truck_id)
    ON UPDATE CASCADE ON DELETE SET NULL (trip_id)
);
CREATE INDEX expenses_owner_date_idx ON public.expenses (owner_id, date DESC);
CREATE INDEX expenses_owner_truck_idx ON public.expenses (owner_id, truck_id);
CREATE INDEX expenses_trip_idx ON public.expenses (owner_id, trip_id, truck_id);

CREATE FUNCTION public.oasis_set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trucks_updated_at BEFORE UPDATE ON public.trucks FOR EACH ROW EXECUTE FUNCTION public.oasis_set_updated_at();
CREATE TRIGGER trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.oasis_set_updated_at();
CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.oasis_set_updated_at();

ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY trucks_owner_access ON public.trucks FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid())) WITH CHECK (owner_id = (SELECT auth.uid()));
CREATE POLICY trips_owner_access ON public.trips FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid())) WITH CHECK (owner_id = (SELECT auth.uid()));
CREATE POLICY expenses_owner_access ON public.expenses FOR ALL TO authenticated
  USING (owner_id = (SELECT auth.uid())) WITH CHECK (owner_id = (SELECT auth.uid()));

REVOKE ALL ON public.trucks, public.trips, public.expenses FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trucks, public.trips, public.expenses TO authenticated;
REVOKE EXECUTE ON FUNCTION public.oasis_set_updated_at() FROM PUBLIC, anon, authenticated;
