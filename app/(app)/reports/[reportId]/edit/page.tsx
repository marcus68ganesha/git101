import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTemplateById } from "@/lib/reportTemplate";
import ReportForm from "@/components/ReportForm";
import type { ReportAnswer } from "@/lib/types";
import { updateReport } from "../../actions";

export default async function EditReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("progress_reports")
    .select("*, students(first_name, last_name)")
    .eq("id", reportId)
    .single();

  if (!report) {
    notFound();
  }

  const [template, { data: answers }] = await Promise.all([
    getTemplateById(supabase, report.template_id),
    supabase.from("report_answers").select("*").eq("report_id", reportId),
  ]);

  if (!template) {
    notFound();
  }

  const answersByItem = new Map<string, ReportAnswer>(
    (answers ?? []).map((a) => [a.item_id, a]),
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Edit report
      </h1>
      <div className="mt-6">
        <ReportForm
          template={template}
          action={updateReport.bind(null, reportId)}
          submitLabel="Save changes"
          fixedStudentName={`${report.students.first_name} ${report.students.last_name}`}
          initialHeader={{
            lesson_date: report.lesson_date,
            class_level: report.class_level,
            teacher_name: report.teacher_name,
            duration_text: report.duration_text,
          }}
          existingAnswers={answersByItem}
        />
      </div>
    </div>
  );
}
