import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getTemplateById } from "@/lib/reportTemplate";
import ReportDocument from "@/lib/pdf/ReportDocument";
import type { ReportAnswer } from "@/lib/types";

// @react-pdf/renderer needs Node APIs (fs, etc.) to render server-side —
// not available in the Edge runtime.
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await params;
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("progress_reports")
    .select("*, students(first_name, last_name)")
    .eq("id", reportId)
    .single();

  if (!report) {
    return new Response("Report not found", { status: 404 });
  }

  const [template, { data: answers }] = await Promise.all([
    getTemplateById(supabase, report.template_id),
    supabase.from("report_answers").select("*").eq("report_id", reportId),
  ]);

  if (!template) {
    return new Response("Report template not found", { status: 404 });
  }

  const answersByItem = new Map<string, ReportAnswer>(
    (answers ?? []).map((a) => [a.item_id, a]),
  );

  const studentName = `${report.students.first_name} ${report.students.last_name}`;

  const buffer = await renderToBuffer(
    ReportDocument({
      studentName,
      report,
      template,
      answersByItem,
    }),
  );

  const fileName = `${studentName.replace(/\s+/g, "_")}_${report.lesson_date}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      // "inline" opens it in the browser's own PDF viewer, which has its
      // own Print button — download and print both reuse this one path.
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
