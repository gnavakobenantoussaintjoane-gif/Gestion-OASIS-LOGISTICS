-- Integration assertions against PostgreSQL. All fixtures are rolled back.
BEGIN;
DO $$
DECLARE a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); ca uuid; cb uuid; d uuid; t uuid; other_truck uuid; terminal uuid; container uuid; day_tariff uuid; night_tariff uuid; journey uuid; night_journey uuid; charge uuid; n integer; snapshot_price bigint;
BEGIN
 INSERT INTO auth.users(id,email,email_confirmed_at) VALUES(a,a::text||'@test.invalid',now()),(b,b::text||'@test.invalid',now()),(o,o::text||'@test.invalid',now());
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 ca:=public.gestion_create_company('Integration A','Admin A');
 PERFORM set_config('request.jwt.claim.sub',b::text,true);
 cb:=public.gestion_create_company('Integration B','Admin B');
 INSERT INTO public.trucks(company_id,plate,brand,model,year) VALUES(cb,'TEST B','Test','Fixture',2026) RETURNING id INTO other_truck;
 INSERT INTO public.profiles(id,company_id,full_name) VALUES(o,ca,'Operator A');
 INSERT INTO public.user_roles(user_id,company_id,role) VALUES(o,ca,'operator');
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 PERFORM set_config('role','authenticated',true);
 SELECT count(*) INTO n FROM public.companies; IF n<>1 THEN RAISE EXCEPTION 'Tenant isolation failed'; END IF;
 SELECT count(*) INTO n FROM public.trucks WHERE id=other_truck; IF n<>0 THEN RAISE EXCEPTION 'Cross-company truck exposed'; END IF;
 INSERT INTO public.drivers(company_id,first_name,last_name,phone,license_number,license_expiry) VALUES(ca,'Fixture','Driver','000','TEST','2030-01-01') RETURNING id INTO d;
 INSERT INTO public.trucks(company_id,plate,brand,model,year,driver_id) VALUES(ca,'TEST A','Test','Fixture',2026,d) RETURNING id INTO t;
 SELECT id INTO terminal FROM public.terminals WHERE company_id=ca AND code='ATL';
 SELECT id INTO container FROM public.container_types WHERE company_id=ca AND kind='40_DRY';
 INSERT INTO public.tariff_rules(company_id,terminal_id,container_type_id,load,shift,price) VALUES(ca,terminal,container,'Plein','day',45000) RETURNING id INTO day_tariff;
 INSERT INTO public.tariff_rules(company_id,terminal_id,container_type_id,load,shift,price) VALUES(ca,terminal,container,'Plein','night',65000) RETURNING id INTO night_tariff;
 INSERT INTO public.trips(company_id,truck_id,driver_id,occurred_at,terminal_id,container_type_id,load,tariff_rule_id) VALUES(ca,t,d,'2026-11-11 06:00Z',terminal,container,'Plein',day_tariff) RETURNING id INTO journey;
 INSERT INTO public.trips(company_id,truck_id,driver_id,occurred_at,terminal_id,container_type_id,load,tariff_rule_id) VALUES(ca,t,d,'2026-11-12 02:00Z',terminal,container,'Plein',night_tariff) RETURNING id INTO night_journey;
 IF NOT EXISTS(SELECT 1 FROM public.trips WHERE id=night_journey AND accounting_date='2026-11-11' AND shift='night' AND price=65000) THEN RAISE EXCEPTION 'Night accounting failed'; END IF;
 BEGIN
 INSERT INTO public.trips(company_id,truck_id,driver_id,occurred_at,terminal_id,container_type_id,load,tariff_rule_id) VALUES(ca,t,d,'2026-11-11 18:45Z',terminal,container,'Plein',day_tariff);
 RAISE EXCEPTION 'Out-of-shift accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
 INSERT INTO public.trips(company_id,truck_id,driver_id,occurred_at,terminal_id,container_type_id,load,tariff_rule_id) VALUES(ca,other_truck,d,'2026-11-11 08:00Z',terminal,container,'Plein',day_tariff);
 RAISE EXCEPTION 'Cross-company FK accepted'; EXCEPTION WHEN foreign_key_violation OR check_violation THEN NULL; END;
 BEGIN
 INSERT INTO public.trips(company_id,truck_id,driver_id,occurred_at,terminal_id,container_type_id,load,tariff_rule_id) VALUES(ca,t,d,'2026-11-11 06:00Z',terminal,container,'Plein',day_tariff);
 RAISE EXCEPTION 'Duplicate accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 UPDATE public.tariff_rules SET price=90000 WHERE id=day_tariff;
 UPDATE public.trips SET observations='Snapshot stays immutable',price=1 WHERE id=journey;
 SELECT price INTO snapshot_price FROM public.trips WHERE id=journey; IF snapshot_price<>45000 THEN RAISE EXCEPTION 'Historical tariff changed'; END IF;
 INSERT INTO public.expenses(company_id,date,amount,category_id,description,trip_id) SELECT ca,'2026-11-11',5000,id,'Fixture only',journey FROM public.expense_categories WHERE company_id=ca AND name='Carburant' RETURNING id INTO charge;
 IF NOT EXISTS(SELECT 1 FROM public.expenses WHERE id=charge AND truck_id=t AND driver_id=d AND shift='day') THEN RAISE EXCEPTION 'Expense linkage failed'; END IF;
 SELECT count(*) INTO n FROM public.audit_logs WHERE company_id=ca; IF n<5 THEN RAISE EXCEPTION 'Audit missing'; END IF;
 PERFORM set_config('request.jwt.claim.sub',o::text,true);
 SELECT count(*) INTO n FROM public.expenses; IF n<>0 THEN RAISE EXCEPTION 'Operator sees finances'; END IF;
 UPDATE public.tariff_rules SET price=1 WHERE id=day_tariff; GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Operator edits tariffs'; END IF;
 BEGIN
 UPDATE public.profiles SET company_id=cb WHERE id=o; RAISE EXCEPTION 'Profile company escalation accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 DELETE FROM public.trips WHERE id=journey;
 IF NOT EXISTS(SELECT 1 FROM public.expenses WHERE id=charge AND trip_id IS NULL AND amount=5000) THEN RAISE EXCEPTION 'Expense lost on deletion'; END IF;
 PERFORM set_config('role','anon',true);
 BEGIN PERFORM count(*) FROM public.trucks; RAISE EXCEPTION 'Anonymous access accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('role','none',true);
END $$;
ROLLBACK;
SELECT 'PASS: tenant isolation, role restrictions, shift dates, tariffs, duplicates, expense preservation, audit and anonymous denial. All fixtures rolled back.' AS result;
