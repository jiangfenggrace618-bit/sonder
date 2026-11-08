# Sonder

A quiet archive of life, memories and moments.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Add the Supabase project URL and publishable key. Never use the secret/service-role key in browser code.
4. In Supabase Authentication → URL Configuration, add your local and production site URLs. Add `/auth/callback` to the allowed redirect URLs.
5. Run `npm run dev`.

## Current MVP

- Email/password sign-up and sign-in with confirmation callback.
- Personal journal create, read, edit and delete.
- Up to 8 photos per entry, private Storage and signed image URLs.
- Per-entry visibility: public, followers-only, private.
- Public journal feed and follow/unfollow.
- Public profiles with username, bio, avatar and custom background/theme.
- Personal JSON backup including journal text, photo files, profile media, follow relationships and guestbook entries.
- Chinese/English language preference shared across the site.
- Global and per-profile guestbooks.
- Responsive layouts and Chinese-first interface.

The guestbook table and follow constraints are applied to the connected Supabase project. Keep the matching SQL migration in your database change history.

## Security

- RLS is enabled on all exposed application tables.
- Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable.
- Use the publishable key with Row Level Security.
