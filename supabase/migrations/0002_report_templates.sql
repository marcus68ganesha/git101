-- Phase 2: progress reports built on an editable template, instead of a
-- fixed set of columns. A "template" is a reusable report design — scoring
-- criteria, multiple-choice questions, and open-text questions — that a
-- teacher can add to / edit / delete / reorder from the Template Editor UI
-- (Phase 2b) without any code change. Filled-in reports reference which
-- template item each answer belongs to, so editing a question's wording
-- later doesn't corrupt reports that already exist.
--
-- Seeded below with the exact content of the uploaded
-- "Teacher Observation Report" format: 6 scoring criteria (/10 each),
-- 7 multiple-choice observation questions, and 2 open-text questions
-- ("Outstanding Moment" and "To Improve").

-- ---------------------------------------------------------------------
-- report_templates: one row per template design. Only one is "active"
-- (used for new reports) at a time, but old templates are kept so past
-- reports stay readable even after the active template changes.
-- ---------------------------------------------------------------------
create table if not exists public.report_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.report_templates enable row level security;

create policy "Authenticated users can read report_templates"
  on public.report_templates for select to authenticated using (true);
create policy "Authenticated users can insert report_templates"
  on public.report_templates for insert to authenticated with check (true);
create policy "Authenticated users can update report_templates"
  on public.report_templates for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete report_templates"
  on public.report_templates for delete to authenticated using (true);

drop trigger if exists set_report_templates_updated_at on public.report_templates;
create trigger set_report_templates_updated_at
  before update on public.report_templates
  for each row execute function public.set_updated_at();

-- Only one template may be active at a time.
create unique index if not exists report_templates_one_active_idx
  on public.report_templates (is_active)
  where is_active;

-- ---------------------------------------------------------------------
-- report_template_items: the ordered questions/criteria within a template.
-- ---------------------------------------------------------------------
create table if not exists public.report_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.report_templates (id) on delete cascade,
  section text not null check (section in ('scoring', 'observation', 'notes')),
  item_type text not null check (item_type in ('score', 'single_choice', 'open_text')),
  label text not null,
  helper_text text,
  max_score int,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint score_items_have_max_score
    check (item_type <> 'score' or max_score is not null)
);

alter table public.report_template_items enable row level security;

create policy "Authenticated users can read report_template_items"
  on public.report_template_items for select to authenticated using (true);
create policy "Authenticated users can insert report_template_items"
  on public.report_template_items for insert to authenticated with check (true);
create policy "Authenticated users can update report_template_items"
  on public.report_template_items for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete report_template_items"
  on public.report_template_items for delete to authenticated using (true);

drop trigger if exists set_report_template_items_updated_at on public.report_template_items;
create trigger set_report_template_items_updated_at
  before update on public.report_template_items
  for each row execute function public.set_updated_at();

create index if not exists report_template_items_template_idx
  on public.report_template_items (template_id, sort_order);

-- ---------------------------------------------------------------------
-- report_template_options: the choices for a 'single_choice' item.
-- ---------------------------------------------------------------------
create table if not exists public.report_template_options (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.report_template_items (id) on delete cascade,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.report_template_options enable row level security;

create policy "Authenticated users can read report_template_options"
  on public.report_template_options for select to authenticated using (true);
create policy "Authenticated users can insert report_template_options"
  on public.report_template_options for insert to authenticated with check (true);
create policy "Authenticated users can update report_template_options"
  on public.report_template_options for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete report_template_options"
  on public.report_template_options for delete to authenticated using (true);

create index if not exists report_template_options_item_idx
  on public.report_template_options (item_id, sort_order);

-- ---------------------------------------------------------------------
-- progress_reports: one filled-in report for one student, using a
-- specific template (snapshot reference — stays valid even if a newer
-- template later becomes active).
-- ---------------------------------------------------------------------
create table if not exists public.progress_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  template_id uuid not null references public.report_templates (id),
  lesson_date date not null default current_date,
  class_level text,
  teacher_name text,
  duration_text text,
  status text not null default 'draft' check (status in ('draft', 'final')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.progress_reports enable row level security;

create policy "Authenticated users can read progress_reports"
  on public.progress_reports for select to authenticated using (true);
create policy "Authenticated users can insert progress_reports"
  on public.progress_reports for insert to authenticated with check (true);
create policy "Authenticated users can update progress_reports"
  on public.progress_reports for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete progress_reports"
  on public.progress_reports for delete to authenticated using (true);

drop trigger if exists set_progress_reports_updated_at on public.progress_reports;
create trigger set_progress_reports_updated_at
  before update on public.progress_reports
  for each row execute function public.set_updated_at();

create index if not exists progress_reports_student_idx
  on public.progress_reports (student_id, lesson_date desc);

-- ---------------------------------------------------------------------
-- report_answers: the filled-in value for one template item, on one
-- report. Exactly one of score_value / selected_option_id / text_value
-- is populated, matching the parent item's item_type.
-- ---------------------------------------------------------------------
create table if not exists public.report_answers (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.progress_reports (id) on delete cascade,
  item_id uuid not null references public.report_template_items (id),
  score_value int,
  selected_option_id uuid references public.report_template_options (id),
  text_value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, item_id)
);

alter table public.report_answers enable row level security;

create policy "Authenticated users can read report_answers"
  on public.report_answers for select to authenticated using (true);
create policy "Authenticated users can insert report_answers"
  on public.report_answers for insert to authenticated with check (true);
create policy "Authenticated users can update report_answers"
  on public.report_answers for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete report_answers"
  on public.report_answers for delete to authenticated using (true);

drop trigger if exists set_report_answers_updated_at on public.report_answers;
create trigger set_report_answers_updated_at
  before update on public.report_answers
  for each row execute function public.set_updated_at();

create index if not exists report_answers_report_idx
  on public.report_answers (report_id);

-- ---------------------------------------------------------------------
-- Seed: the "Teacher Observation Report" template, exactly matching the
-- uploaded docx. Wrapped so re-running this migration is safe (it does
-- nothing if a template with this name already exists).
-- ---------------------------------------------------------------------
do $$
declare
  v_template_id uuid;
  v_item_id uuid;
begin
  if exists (select 1 from public.report_templates where name = 'Teacher Observation Report') then
    return;
  end if;

  insert into public.report_templates (name, is_active)
  values ('Teacher Observation Report', true)
  returning id into v_template_id;

  -- Scoring criteria (section = 'scoring', item_type = 'score', /10 each)
  insert into public.report_template_items (template_id, section, item_type, label, sort_order, max_score)
  values
    (v_template_id, 'scoring', 'score', 'Creativity and Innovation', 1, 10),
    (v_template_id, 'scoring', 'score', 'Communication Skill', 2, 10),
    (v_template_id, 'scoring', 'score', 'Technical Skill', 3, 10),
    (v_template_id, 'scoring', 'score', 'Adaptability and Resilience', 4, 10),
    (v_template_id, 'scoring', 'score', 'Scientific Inquiry', 5, 10),
    (v_template_id, 'scoring', 'score', 'Confidence', 6, 10);

  -- Q1: Focus and Engagement
  insert into public.report_template_items (template_id, section, item_type, label, helper_text, sort_order)
  values (v_template_id, 'observation', 'single_choice', 'Focus and Engagement',
    'How well did the student maintain attention during the hands-on building or coding session?', 1)
  returning id into v_item_id;
  insert into public.report_template_options (item_id, label, sort_order) values
    (v_item_id, 'Highly focused and on-task throughout the class', 1),
    (v_item_id, 'Generally focused, but occasionally distracted', 2),
    (v_item_id, 'Easily distracted (by peers, surroundings, etc.)', 3),
    (v_item_id, 'Required frequent redirection from the teacher', 4);

  -- Q2: Problem-Solving Independence
  insert into public.report_template_items (template_id, section, item_type, label, helper_text, sort_order)
  values (v_template_id, 'observation', 'single_choice', 'Problem-Solving Independence',
    'When encountering a challenge (e.g., a mechanism falling apart or a code error), what was the student''s initial reaction?', 2)
  returning id into v_item_id;
  insert into public.report_template_options (item_id, label, sort_order) values
    (v_item_id, 'Immediately tried to troubleshoot independently', 1),
    (v_item_id, 'Tried briefly, then asked for help', 2),
    (v_item_id, 'Immediately asked the teacher for help without trying', 3),
    (v_item_id, 'Became visibly frustrated or gave up', 4);

  -- Q3: Execution and Pacing
  insert into public.report_template_items (template_id, section, item_type, label, helper_text, sort_order)
  values (v_template_id, 'observation', 'single_choice', 'Execution and Pacing',
    'How did the student''s pacing compare to the rest of the class?', 3)
  returning id into v_item_id;
  insert into public.report_template_options (item_id, label, sort_order) values
    (v_item_id, 'Finished early and had time for extra activities', 1),
    (v_item_id, 'Completed the core project exactly on time', 2),
    (v_item_id, 'Required extra time or significant assistance to finish', 3);

  -- Q4: Creativity and Innovation (question, distinct from the scoring criterion of the same name)
  insert into public.report_template_items (template_id, section, item_type, label, helper_text, sort_order)
  values (v_template_id, 'observation', 'single_choice', 'Creativity and Innovation',
    'Did the student strictly follow the step-by-step instructions, or did they attempt to add custom modifications?', 4)
  returning id into v_item_id;
  insert into public.report_template_options (item_id, label, sort_order) values
    (v_item_id, 'Added highly creative, original modifications to the design/code', 1),
    (v_item_id, 'Added minor, simple modifications (e.g., color changes)', 2),
    (v_item_id, 'Strictly followed the instructions with no changes', 3),
    (v_item_id, 'Struggled to complete the base instructions', 4);

  -- Q5: Technical and Motor Skills
  insert into public.report_template_items (template_id, section, item_type, label, helper_text, sort_order)
  values (v_template_id, 'observation', 'single_choice', 'Technical and Motor Skills',
    'Did the student struggle with any physical assembly or software navigation during the class?', 5)
  returning id into v_item_id;
  insert into public.report_template_options (item_id, label, sort_order) values
    (v_item_id, 'Handled all physical/digital components with ease', 1),
    (v_item_id, 'Managed well, but needed minor help with tricky parts (e.g., tight pins, specific wires)', 2),
    (v_item_id, 'Struggled significantly with the physical assembly or software', 3);

  -- Q6: Peer Interaction
  insert into public.report_template_items (template_id, section, item_type, label, helper_text, sort_order)
  values (v_template_id, 'observation', 'single_choice', 'Peer Interaction',
    'How did the student interact with their classmates today?', 6)
  returning id into v_item_id;
  insert into public.report_template_options (item_id, label, sort_order) values
    (v_item_id, 'Collaborated effectively and helped others', 1),
    (v_item_id, 'Worked well independently, kept to themselves', 2),
    (v_item_id, 'Was easily distracted by peers or distracted others', 3),
    (v_item_id, 'Had difficulty sharing components or space', 4);

  -- Q7: Comprehension and Communication
  insert into public.report_template_items (template_id, section, item_type, label, helper_text, sort_order)
  values (v_template_id, 'observation', 'single_choice', 'Comprehension and Communication',
    'When asked about their completed project, could the student clearly explain how the mechanism worked or what their code did?', 7)
  returning id into v_item_id;
  insert into public.report_template_options (item_id, label, sort_order) values
    (v_item_id, 'Yes, explained the mechanics/logic clearly and confidently', 1),
    (v_item_id, 'Could explain the basics, but missed some technical details', 2),
    (v_item_id, 'Struggled to explain how their build/code functioned', 3);

  -- Q8: Outstanding Moment (open text, still part of the observation section)
  insert into public.report_template_items (template_id, section, item_type, label, helper_text, sort_order)
  values (v_template_id, 'observation', 'open_text', 'Outstanding Moment',
    'What was one specific, memorable thing the student did or said during this class that stood out?', 8);

  -- To Improve (open text notes, its own section)
  insert into public.report_template_items (template_id, section, item_type, label, sort_order)
  values (v_template_id, 'notes', 'open_text', 'To Improve', 1);
end $$;
