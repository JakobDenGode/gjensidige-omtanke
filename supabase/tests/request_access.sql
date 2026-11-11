-- Transactional integration check: all test users and records are rolled back.
begin;
insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
insert into public.help_requests (kind, category, task, timing)
values ('request', 'Test', 'Access isolation test', 'Denne uken');

do $$ begin
  if (select count(*) from public.help_requests) <> 1 then
    raise exception 'Owner cannot read their request';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
do $$ begin
  if exists (select 1 from public.help_requests) then
    raise exception 'Another user can read private requests';
  end if;
  update public.help_requests set status = 'cancelled';
  if found then raise exception 'Another user can modify private requests'; end if;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
update public.help_requests set status = 'cancelled';
do $$ begin
  if not exists (select 1 from public.help_requests where status = 'cancelled') then
    raise exception 'Owner cannot cancel their request';
  end if;
end $$;
reset role;
rollback;
