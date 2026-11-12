begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000091');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
insert into public.customer_profiles(city,full_name,preferences_completed,postal_code) values('Oslo','Radius test',true,'0123');
do $$begin
 if not exists(select 1 from public.customer_profiles where travel_km=3) then raise exception 'Default radius missing';end if;
 update public.customer_profiles set travel_km=9;
 if not exists(select 1 from public.customer_profiles where travel_km=9) then raise exception 'Radius not saved';end if;
 begin update public.customer_profiles set travel_km=5;raise exception 'Invalid radius accepted';exception when check_violation then null;end;
end $$;
reset role;
rollback;
