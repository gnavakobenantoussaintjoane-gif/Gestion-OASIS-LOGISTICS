-- Boundary and availability assertions. No fixture is committed.
BEGIN;
DO $$ DECLARE u uuid:=gen_random_uuid(); c uuid; d uuid; t uuid; term uuid; ct uuid; td uuid; tn uuid; ts timestamptz; expected_shift text; expected_date date; rowdata public.trips; BEGIN
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES(u,u::text||'@test.invalid',now()); PERFORM set_config('request.jwt.claim.sub',u::text,true); c:=public.gestion_create_company('Boundary tests','Boundary tester'); PERFORM set_config('role','authenticated',true);
INSERT INTO public.drivers(company_id,first_name,last_name,phone,license_number,license_expiry) VALUES(c,'Fixture','Driver','0','BOUNDARY','2030-01-01') RETURNING id INTO d;
INSERT INTO public.trucks(company_id,plate,brand,model,year,driver_id) VALUES(c,'BOUNDARY','Test','Fixture',2026,d) RETURNING id INTO t;
SELECT id INTO term FROM public.terminals WHERE company_id=c AND code='ATL'; SELECT id INTO ct FROM public.container_types WHERE company_id=c AND kind='40_DRY';
INSERT INTO public.tariff_rules(company_id,terminal_id,container_type_id,load,shift,price) VALUES(c,term,ct,'Plein','day',1) RETURNING id INTO td;
INSERT INTO public.tariff_rules(company_id,terminal_id,container_type_id,load,shift,price) VALUES(c,term,ct,'Plein','night',2) RETURNING id INTO tn;
FOR ts,expected_shift,expected_date IN SELECT * FROM (VALUES ('2026-11-12 06:00Z'::timestamptz,'day','2026-11-12'::date),('2026-11-12 18:30Z'::timestamptz,'day','2026-11-12'::date),('2026-11-12 19:00Z'::timestamptz,'night','2026-11-12'::date),('2026-11-12 23:00Z'::timestamptz,'night','2026-11-12'::date),('2026-11-12 00:00Z'::timestamptz,'night','2026-11-11'::date),('2026-11-12 05:59Z'::timestamptz,'night','2026-11-11'::date),('2026-11-13 06:00Z'::timestamptz,'day','2026-11-13'::date)) AS cases(ts,s,dt) LOOP
INSERT INTO public.trips(company_id,truck_id,driver_id,occurred_at,terminal_id,container_type_id,load,tariff_rule_id) VALUES(c,t,d,ts,term,ct,'Plein',CASE expected_shift WHEN 'day' THEN td ELSE tn END) RETURNING * INTO rowdata;
IF rowdata.shift<>expected_shift OR rowdata.accounting_date<>expected_date THEN RAISE EXCEPTION 'Boundary failed for %',ts; END IF;
END LOOP;
BEGIN INSERT INTO public.trips(company_id,truck_id,driver_id,occurred_at,terminal_id,container_type_id,load,tariff_rule_id) VALUES(c,t,d,'2026-11-12 18:45Z',term,ct,'Plein',td); RAISE EXCEPTION '18:45 accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
UPDATE public.trucks SET archived=true WHERE id=t;
BEGIN INSERT INTO public.trips(company_id,truck_id,driver_id,occurred_at,terminal_id,container_type_id,load,tariff_rule_id) VALUES(c,t,d,'2026-11-14 08:00Z',term,ct,'Plein',td); RAISE EXCEPTION 'Archived truck accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
PERFORM set_config('role','none',true);
END $$;
ROLLBACK;
SELECT 'PASS: all SQL shift boundaries and archived-truck rejection. No fixtures persisted.' AS result;
