begin;
insert into auth.users (id) values
 ('00000000-0000-4000-8000-000000000021'),
 ('00000000-0000-4000-8000-000000000022');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000021', true);
insert into public.customer_profiles (city) values ('Oslo');
update public.customer_profiles set city = 'Bergen';
do $$ begin
  if not exists (select 1 from public.customer_profiles where city = 'Bergen') then
    raise exception 'Owner cannot save or edit city';
  end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000022', true);
do $$ begin
  if exists (select 1 from public.customer_profiles) then raise exception 'Another user can see profile'; end if;
  update public.customer_profiles set city = 'Oslo';
  if found then raise exception 'Another user can change city'; end if;
  begin
    insert into public.customer_profiles (user_id, city) values ('00000000-0000-4000-8000-000000000021', 'Oslo');
    raise exception 'Another user can create owner profile';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
