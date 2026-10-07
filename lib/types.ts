// Hand-written types mirroring the Supabase schema (supabase/migrations).
// Swap for `supabase gen types typescript` output once the schema settles.

export type Student = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  grade_level: string | null;
  guardian_name: string | null;
  guardian_contact: string | null;
  notes: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentInput = {
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  grade_level: string | null;
  guardian_name: string | null;
  guardian_contact: string | null;
  notes: string | null;
};

// --- Report templates (Phase 2) -------------------------------------
// A template's structure (its items/options) is edited through the
// Template Editor (app/(app)/reports/template) and never hardcoded —
// this file only types the shape, it doesn't define the questions.

export type ReportTemplate = {
  id: string;
  name: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TemplateSection = "scoring" | "observation" | "notes";
export type TemplateItemType = "score" | "single_choice" | "open_text";

export type ReportTemplateItem = {
  id: string;
  template_id: string;
  section: TemplateSection;
  item_type: TemplateItemType;
  label: string;
  helper_text: string | null;
  max_score: number | null;
  sort_order: number;
};

export type ReportTemplateOption = {
  id: string;
  item_id: string;
  label: string;
  sort_order: number;
};

// An item with its options eagerly loaded (options is [] for non-choice items)
export type TemplateItemWithOptions = ReportTemplateItem & {
  report_template_options: ReportTemplateOption[];
};

export type TemplateWithItems = ReportTemplate & {
  report_template_items: TemplateItemWithOptions[];
};

// --- Progress reports (filled-in instances of a template) ------------

export type ProgressReport = {
  id: string;
  student_id: string;
  template_id: string;
  lesson_date: string;
  class_level: string | null;
  teacher_name: string | null;
  duration_text: string | null;
  status: "draft" | "final";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ReportAnswer = {
  id: string;
  report_id: string;
  item_id: string;
  score_value: number | null;
  selected_option_id: string | null;
  text_value: string | null;
};

// A single answer, as collected from the form before it has an id yet.
export type AnswerInput = {
  item_id: string;
  score_value?: number | null;
  selected_option_id?: string | null;
  text_value?: string | null;
};
