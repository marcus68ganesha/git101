import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTemplateById } from "@/lib/reportTemplate";
import type { ReportAnswer, TemplateWithItems } from "@/lib/types";
import { deleteReport, setReportStatus } from "../actions";

export default async function ViewReportPage({
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {report.students.first_name} {report.students.last_name}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {report.lesson_date}
            {report.class_level && ` · ${report.class_level}`}
            {" · "}
            <StatusBadge status={report.status} />
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/reports/${report.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            Download / Print PDF
          </a>
          <Link
            href={`/reports/${report.id}/edit`}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            Edit
          </Link>
        </div>
      </div>

      <dl className="mt-6 grid max-w-lg grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <DetailRow label="Teacher" value={report.teacher_name} />
        <DetailRow label="Duration" value={report.duration_text} />
      </dl>

      <div className="mt-8 flex flex-col gap-8">
        <ItemSection
          title="Scoring"
          items={template.report_template_items.filter(
            (i) => i.section === "scoring",
          )}
          answersByItem={answersByItem}
        />
        <ItemSection
          title="Observation"
          items={template.report_template_items.filter(
            (i) => i.section === "observation",
          )}
          answersByItem={answersByItem}
        />
        <ItemSection
          title="Notes"
          items={template.report_template_items.filter(
            (i) => i.section === "notes",
          )}
          answersByItem={answersByItem}
        />
      </div>

      <div className="mt-10 flex items-center gap-4 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
        {report.status === "draft" ? (
          <form action={setReportStatus.bind(null, report.id, "final")}>
            <button type="submit" className="text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400">
              Mark as final
            </button>
          </form>
        ) : (
          <form action={setReportStatus.bind(null, report.id, "draft")}>
            <button type="submit" className="text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400">
              Revert to draft
            </button>
          </form>
        )}
        <form action={deleteReport.bind(null, report.id)}>
          <button type="submit" className="text-red-600 underline hover:text-red-800 dark:text-red-400">
            Delete report
          </button>
        </form>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={
        status === "final"
          ? "rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300"
          : "rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
      }
    >
      {status === "final" ? "Final" : "Draft"}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <>
      <dt className="font-medium text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-zinc-900 dark:text-zinc-50">{value ?? "—"}</dd>
    </>
  );
}

function ItemSection({
  title,
  items,
  answersByItem,
}: {
  title: string;
  items: TemplateWithItems["report_template_items"];
  answersByItem: Map<string, ReportAnswer>;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <dl className="mt-3 flex flex-col gap-3">
        {items.map((item) => {
          const answer = answersByItem.get(item.id);
          let display: string = "—";

          if (item.item_type === "score") {
            display =
              answer?.score_value != null
                ? `${answer.score_value} / ${item.max_score}`
                : "—";
          } else if (item.item_type === "single_choice") {
            const option = item.report_template_options.find(
              (o) => o.id === answer?.selected_option_id,
            );
            display = option?.label ?? "—";
          } else {
            display = answer?.text_value || "—";
          }

          return (
            <div key={item.id} className="text-sm">
              <dt className="font-medium text-zinc-700 dark:text-zinc-300">
                {item.label}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-zinc-900 dark:text-zinc-50">
                {display}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
