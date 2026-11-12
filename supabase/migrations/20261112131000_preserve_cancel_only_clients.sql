-- The deployed client still cancels using a status UPDATE until the new UI ships.
-- Preserve that operation without allowing fabricated completion or reopening.
create function public.guard_request_status() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
  if current_user in ('authenticated','anon') and
    (old.status <> 'open' or new.status <> 'cancelled' or old.user_id <> auth.uid())
    then raise exception 'Only cancellation is permitted directly'; end if;
  return new;
end $$;
create trigger guard_request_status before update on public.help_requests
  for each row execute function public.guard_request_status();
grant update (status) on public.help_requests to authenticated;
