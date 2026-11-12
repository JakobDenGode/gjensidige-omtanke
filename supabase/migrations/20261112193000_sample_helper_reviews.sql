begin;
-- Presentation samples are deliberately separate from completed-task reviews.
create table public.sample_helper_reviews (
  helper_id uuid primary key references auth.users(id) on delete cascade,
  rating numeric(2,1) not null check (rating between 1 and 5),
  sample_count integer not null check (sample_count > 0),
  comment text not null,
  sample_author text not null
);
alter table public.sample_helper_reviews enable row level security;
revoke all on public.sample_helper_reviews from anon, authenticated;
grant select on public.sample_helper_reviews to authenticated;
create policy "Signed-in users see directory review samples"
  on public.sample_helper_reviews for select to authenticated
  using (exists (select 1 from public.available_helpers() h where h.member_id = helper_id));

insert into public.sample_helper_reviews (helper_id, rating, sample_count, comment, sample_author)
select user_id,
  case when lower(trim(full_name)) = 'jabo babo' then 1.5
       when 'Hagearbeid' = any(can_help) then 4.9
       when 'Besøk og selskap' = any(can_help) then 4.8
       when 'Snømåking' = any(can_help) then 4.6 else 4.9 end,
  case when lower(trim(full_name)) = 'jabo babo' then 1
       when 'Hagearbeid' = any(can_help) then 34
       when 'Besøk og selskap' = any(can_help) then 19
       when 'Snømåking' = any(can_help) then 24 else 28 end,
  case when lower(trim(full_name)) = 'jabo babo' then 'Eksempel på en lav vurdering.'
       when 'Hagearbeid' = any(can_help) then 'Ryddet godt rundt huset og tok hensyn til plantene.'
       when 'Besøk og selskap' = any(can_help) then 'Hjalp meg med inngangen. Nå går vi også tur sammen.'
       when 'Snømåking' = any(can_help) then 'Godt jobbet, snøen forsvant.'
       else 'Godt å ha en nabo som stiller opp. Vi hjelper hverandre.' end,
  case when lower(trim(full_name)) = 'jabo babo' then 'Eksempelbruker'
       when 'Hagearbeid' = any(can_help) then 'Liv'
       when 'Besøk og selskap' = any(can_help) then 'Per'
       when 'Snømåking' = any(can_help) then 'Geir' else 'Anne' end
from public.customer_profiles where trim(full_name) <> '';
commit;
