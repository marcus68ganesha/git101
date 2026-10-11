-- Fix: deleting a teacher account failed with "Database error deleting
-- user" whenever that teacher had ever created a student, report, or
-- template — the created_by foreign keys had no ON DELETE behavior, so
-- Postgres blocked the delete rather than clearing the reference.
--
-- Switch them to ON DELETE SET NULL: deleting an account now always
-- succeeds, and past records they created just lose the "created by"
-- attribution instead of blocking deletion.

alter table public.students
  drop constraint if exists students_created_by_fkey,
  add constraint students_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.progress_reports
  drop constraint if exists progress_reports_created_by_fkey,
  add constraint progress_reports_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.report_templates
  drop constraint if exists report_templates_created_by_fkey,
  add constraint report_templates_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;
