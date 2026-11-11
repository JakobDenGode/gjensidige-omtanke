begin;
insert into auth.users (id) values
 ('00000000-0000-4000-8000-000000000011'),
 ('00000000-0000-4000-8000-000000000012'),
 ('00000000-0000-4000-8000-000000000013');
create temporary table test_code (code text);
grant all on test_code to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000011', true);
insert into test_code select public.create_friend_invitation('Test User');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000012', true);
select public.accept_friend_invitation((select code from test_code), 'Test Friend');
do $$ begin
  if (select count(*) from public.user_friends) <> 1 then raise exception 'Friend cannot see connection'; end if;
  begin
    perform public.accept_friend_invitation((select code from test_code), 'Replay');
    raise exception 'Consumed invite accepted';
  exception when raise_exception then
    if sqlerrm = 'Consumed invite accepted' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000013', true);
do $$ begin
  if exists (select 1 from public.user_friends) then raise exception 'Outsider can read connections'; end if;
  delete from public.user_friends;
  if found then raise exception 'Outsider can remove connections'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000011', true);
delete from test_code;
insert into test_code select public.create_friend_invitation('Test User');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000013', true);
select public.accept_friend_invitation((select code from test_code), 'Second Friend');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000011', true);
do $$ begin
  if (select count(*) from public.user_friends) <> 2 then raise exception 'User cannot have multiple friends'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000012', true);
delete from public.user_friends;
do $$ begin
  if exists (select 1 from public.user_friends) then raise exception 'Friend could not remove connection'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000011', true);
delete from public.user_friends;
do $$ begin
  if exists (select 1 from public.user_friends) then raise exception 'User could not remove connection'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000011', true);
delete from test_code;
insert into test_code select public.create_friend_invitation('Test User');
do $$ begin
  begin
    perform public.accept_friend_invitation((select code from test_code), 'Self');
    raise exception 'Self connection accepted';
  exception when raise_exception then
    if sqlerrm = 'Self connection accepted' then raise; end if;
  end;
end $$;
select public.revoke_friend_invitation();
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000012', true);
do $$ begin
  begin
    perform public.accept_friend_invitation((select code from test_code), 'Revoked');
    raise exception 'Revoked invitation accepted';
  exception when raise_exception then
    if sqlerrm = 'Revoked invitation accepted' then raise; end if;
  end;
end $$;
reset role;
rollback;
