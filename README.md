# Sonder

A quiet archive of life, memories and moments.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Fill in the Supabase project URL and publishable key from Supabase Project Settings → API Keys.
4. In Supabase Authentication → URL Configuration, add your local and production site URLs. Add `/auth/callback` to the allowed redirect URLs.
5. Run `npm run dev`.

## Journal MVP

- Email/password sign-up and sign-in.
- Email confirmation callback.
- Personal journal entries with public, followers-only, or private visibility.
- Up to 8 photos per entry, with a 10 MB per-photo limit.
- Private Storage objects and signed image URLs.
- Session refresh through Next.js middleware.

Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable or in browser code. This app uses the publishable key with Row Level Security.
