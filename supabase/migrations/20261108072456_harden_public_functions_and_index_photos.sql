revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create index if not exists post_photos_user_id_idx
  on public.post_photos (user_id);
