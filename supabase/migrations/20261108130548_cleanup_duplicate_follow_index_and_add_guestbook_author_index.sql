drop index if exists public.follows_follower_followed_unique;

create index if not exists guestbook_entries_author_id_idx
  on public.guestbook_entries (author_id);
