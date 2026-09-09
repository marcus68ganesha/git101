# Supabase setup

1. Create a project at [supabase.com](https://supabase.com) (free tier is
   plenty for this app's scale).
2. In the Supabase dashboard, open **SQL Editor** and run each file in
   `migrations/` in order (currently just `0001_profiles_and_students.sql`).
   Re-running a migration is safe — every statement is `if not exists` /
   `or replace` / `drop ... if exists`.
3. Copy **Project Settings → API → Project URL** and **anon public key**
   into your local `.env.local` (see `.env.local.example` in the repo root).
4. Disable public sign-ups: **Authentication → Providers → Email** → turn
   off "Allow new users to sign up". There is no `/signup` page in this
   app — every teacher account is created manually.
5. Create your first teacher account(s): **Authentication → Users → Add
   user**. A matching row in `public.profiles` is created automatically by
   a database trigger.
6. To add or remove a teacher later, come back to this same **Authentication
   → Users** screen — no code changes needed, no limit on how many accounts
   exist.
