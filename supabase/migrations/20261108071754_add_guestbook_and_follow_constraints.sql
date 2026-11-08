create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid null references public.profiles(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists guestbook_entries_profile_created_idx
  on public.guestbook_entries (profile_id, created_at desc);

alter table public.guestbook_entries enable row level security;

grant select on public.guestbook_entries to anon, authenticated;
grant insert, delete on public.guestbook_entries to authenticated;

drop policy if exists "Guestbook entries are publicly readable" on public.guestbook_entries;
create policy "Guestbook entries are publicly readable"
  on public.guestbook_entries for select
  to anon, authenticated
  using (true);

drop policy if exists "Signed-in users can leave guestbook entries" on public.guestbook_entries;
create policy "Signed-in users can leave guestbook entries"
  on public.guestbook_entries for insert
  to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists "Authors or profile owners can delete guestbook entries" on public.guestbook_entries;
create policy "Authors or profile owners can delete guestbook entries"
  on public.guestbook_entries for delete
  to authenticated
  using (
    author_id = (select auth.uid())
    or (
      profile_id is not null
      and exists (
        select 1 from public.profiles p
        where p.id = guestbook_entries.profile_id
          and p.id = (select auth.uid())
      )
    )
  );

create unique index if not exists follows_follower_followed_unique
  on public.follows (follower_id, followed_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'follows_no_self_follow'
      and conrelid = 'public.follows'::regclass
  ) then
    alter table public.follows
      add constraint follows_no_self_follow check (follower_id <> followed_id);
  end if;
end $$;
