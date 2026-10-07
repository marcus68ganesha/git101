"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveTemplate, getTemplateById } from "@/lib/reportTemplate";
import type { AnswerInput, TemplateWithItems } from "@/lib/types";

export type ReportFormState = { error?: string } | undefined;

function readHeader(formData: FormData) {
  const optional = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value.length > 0 ? value : null;
  };
  return {
    lesson_date:
      optional("lesson_date") ?? new Date().toISOString().slice(0, 10),
    class_level: optional("class_level"),
    teacher_name: optional("teacher_name"),
    duration_text: optional("duration_text"),
  };
}

// Reads one answer per template item out of the submitted form, skipping
// items the teacher left blank rather than writing an empty row for them.
function readAnswers(
  template: TemplateWithItems,
  formData: FormData,
): AnswerInput[] {
  const answers: AnswerInput[] = [];

  for (const item of template.report_template_items) {
    const field = formData.get(`item_${item.id}`);
    if (field === null) continue;
    const value = String(field).trim();
    if (!value) continue;

    if (item.item_type === "score") {
      answers.push({ item_id: item.id, score_value: Number(value) });
    } else if (item.item_type === "single_choice") {
      answers.push({ item_id: item.id, selected_option_id: value });
    } else {
      answers.push({ item_id: item.id, text_value: value });
    }
  }

  return answers;
}

export async function createReport(
  _prevState: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const supabase = await createClient();
  const template = await getActiveTemplate(supabase);
  if (!template) {
    return { error: "No active report template found." };
  }

  const student_id = String(formData.get("student_id") ?? "");
  if (!student_id) {
    return { error: "Please choose a student." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: report, error } = await supabase
    .from("progress_reports")
    .insert({
      student_id,
      template_id: template.id,
      created_by: user?.id ?? null,
      ...readHeader(formData),
    })
    .select("id")
    .single();

  if (error || !report) {
    return { error: "Could not save report. Please try again." };
  }

  const answers = readAnswers(template, formData).map((a) => ({
    report_id: report.id,
    ...a,
  }));
  if (answers.length > 0) {
    const { error: answersError } = await supabase
      .from("report_answers")
      .insert(answers);
    if (answersError) {
      return {
        error: `Report created, but some answers failed to save: ${answersError.message}`,
      };
    }
  }

  revalidatePath("/reports");
  redirect(`/reports/${report.id}`);
}

export async function updateReport(
  reportId: string,
  _prevState: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("progress_reports")
    .select("template_id")
    .eq("id", reportId)
    .single();
  if (!existing) {
    return { error: "Report not found." };
  }

  const template = await getTemplateById(supabase, existing.template_id);
  if (!template) {
    return { error: "This report's template could not be loaded." };
  }

  const { error: updateError } = await supabase
    .from("progress_reports")
    .update(readHeader(formData))
    .eq("id", reportId);
  if (updateError) {
    return { error: "Could not save changes. Please try again." };
  }

  const answers = readAnswers(template, formData).map((a) => ({
    report_id: reportId,
    ...a,
  }));
  if (answers.length > 0) {
    const { error: answersError } = await supabase
      .from("report_answers")
      .upsert(answers, { onConflict: "report_id,item_id" });
    if (answersError) {
      return { error: `Could not save answers: ${answersError.message}` };
    }
  }

  revalidatePath("/reports");
  revalidatePath(`/reports/${reportId}`);
  redirect(`/reports/${reportId}`);
}

export async function setReportStatus(reportId: string, status: "draft" | "final") {
  const supabase = await createClient();
  await supabase
    .from("progress_reports")
    .update({ status })
    .eq("id", reportId);
  revalidatePath(`/reports/${reportId}`);
  revalidatePath("/reports");
}

export async function deleteReport(reportId: string) {
  const supabase = await createClient();
  await supabase.from("progress_reports").delete().eq("id", reportId);
  revalidatePath("/reports");
  redirect("/reports");
}
