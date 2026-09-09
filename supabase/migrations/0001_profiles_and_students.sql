-- Phase 1: teacher profiles + student namelist.
--
-- Auth model: every account is a "teacher" with identical full access (no
-- separate admin role, no fixed account limit). Row Level Security is
-- therefore simple: any authenticated user can read/write every row. New
-- teacher accounts are created directly in the Supabase dashboard
-- (Authentication -> Users) — there is no public sign-up page in the app.

-- ---------------------------------------------------------------------
-- profiles: one row per auth.users account, for display name only.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'teacher',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Authenticated users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Authenticated users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Automatically create a profile row whenever a new teacher account is
-- added (e.g. via the Supabase dashboard), so nobody has to remember to
-- insert one by hand.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- updated_at helper trigger, reused by every table below (and by future
-- migrations for progress_reports / lesson_plans).
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- students: the class namelist/roster.
-- ---------------------------------------------------------------------
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  grade_level text,
  guardian_name text,
  guardian_contact text,
  notes text,
  photo_url text,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.students enable row level security;

create policy "Authenticated users can read students"
  on public.students for select
  to authenticated
  using (true);

create policy "Authenticated users can insert students"
  on public.students for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update students"
  on public.students for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete students"
  on public.students for delete
  to authenticated
  using (true);

drop trigger if exists set_students_updated_at on public.students;
create trigger set_students_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

create index if not exists students_is_active_idx on public.students (is_active);
create index if not exists students_last_name_idx on public.students (last_name);
