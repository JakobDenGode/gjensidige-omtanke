create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('request', 'offer')),
  category text not null check (char_length(category) between 1 and 100),
  task text not null check (char_length(task) between 1 and 200),
  timing text not null check (timing in ('Denne uken', 'Neste uke', 'Jeg er fleksibel')),
  description text not null default '' check (char_length(description) <= 2000),
  status text not null default 'open' check (status in ('open', 'cancelled')),
  created_at timestamptz not null default now()
);

create index help_requests_user_created_idx on public.help_requests (user_id, created_at desc);

alter table public.help_requests enable row level security;
revoke all on public.help_requests from anon, authenticated;
grant select, insert on public.help_requests to authenticated;
grant update (status) on public.help_requests to authenticated;

create policy "Users can read their own requests"
  on public.help_requests for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own requests"
  on public.help_requests for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can cancel their own requests"
  on public.help_requests for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
