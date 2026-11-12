begin;
alter table public.help_requests
  add column tasks text[] not null default '{}',
  add column preferred_dates date[] not null default '{}',
  add column time_of_day text not null default 'Fleksibel'
    check (time_of_day in ('Formiddag · kl. 09–12','Ettermiddag · kl. 12–16','Fleksibel'));

-- The authenticated create RPC remains the single atomic sharing boundary.
create or replace function public.create_network_request(draft jsonb, recipients uuid[] default '{}')
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid(); target uuid; recipient uuid;
  selected_tasks text[]; selected_dates date[]; date_value date;
  oslo_today date := (now() at time zone 'Europe/Oslo')::date;
begin
  if actor is null then raise exception 'Sign in required'; end if;
  if not exists (select 1 from public.customer_profiles where user_id = actor and trim(full_name) <> '' and preferences_completed)
    then raise exception 'Complete your profile first'; end if;
  if recipients is null or cardinality(recipients) > 100 then raise exception 'Invalid recipients'; end if;
  if cardinality(recipients) > 0 and draft->>'kind' <> 'request' then raise exception 'Only help requests can be shared'; end if;
  foreach recipient in array recipients loop
    if recipient is null or recipient = actor or not exists (
      select 1 from public.user_friends where (user_id = actor and friend_id = recipient) or (friend_id = actor and user_id = recipient)
    ) then raise exception 'Recipient must be a current friend'; end if;
  end loop;
  select coalesce(array_agg(distinct value), '{}') into selected_tasks
    from jsonb_array_elements_text(coalesce(draft->'tasks', '[]'));
  select coalesce(array_agg(distinct value::date order by value::date), '{}') into selected_dates
    from jsonb_array_elements_text(coalesce(draft->'preferred_dates', '[]'));
  if cardinality(selected_tasks) > 0 or cardinality(selected_dates) > 0 then
    if draft->>'kind' <> 'request' or draft->>'category' <> 'Snømåking'
      or cardinality(selected_tasks) not between 1 and 5
      or not (selected_tasks <@ array['Måke inngang og gangvei','Måke innkjørselen','Flytte snø bort fra husveggen','Fjerne snø rundt sluk og avløp','Strø glatte partier'])
      or cardinality(selected_dates) not between 1 and 31
      or cardinality(recipients) <> 1 then raise exception 'Invalid winter request'; end if;
    foreach date_value in array selected_dates loop
      if date_value < oslo_today or date_value > oslo_today + 365 then raise exception 'Date outside scheduling range'; end if;
    end loop;
  end if;
  insert into public.help_requests (user_id,kind,category,task,timing,description,tasks,preferred_dates,time_of_day)
    values (actor,draft->>'kind',draft->>'category',draft->>'task',draft->>'timing',coalesce(draft->>'description',''),
      selected_tasks,selected_dates,coalesce(draft->>'time_of_day','Fleksibel')) returning id into target;
  insert into public.request_recipients (request_id,recipient_id)
    select target,member from (select distinct unnest(recipients) as member) members;
  return target;
end $$;

drop function public.network_request_inbox();
create function public.network_request_inbox()
returns table (request_id uuid,owner_name text,city text,task text,category text,timing text,description text,status text,response text,tasks text[],preferred_dates date[],time_of_day text)
language sql stable security definer set search_path = public, pg_temp as $$
  select r.id,p.full_name,p.city,r.task,r.category,r.timing,r.description,r.status,rr.response,r.tasks,r.preferred_dates,r.time_of_day
  from public.request_recipients rr join public.help_requests r on r.id = rr.request_id
  join public.customer_profiles p on p.user_id = r.user_id
  where rr.recipient_id = auth.uid() and public.can_read_network_request(r.id)
  order by r.created_at desc limit 100;
$$;
revoke all on function public.network_request_inbox() from public, anon;
grant execute on function public.network_request_inbox() to authenticated;
commit;
