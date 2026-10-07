import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: reports, error } = await supabase
    .from("progress_reports")
    .select("id, lesson_date, class_level, status, students(first_name, last_name)")
    .order("lesson_date", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Progress reports
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/reports/template"
            className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:text-zinc-400"
          >
            Edit template
          </Link>
          <Link
            href="/reports/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            New report
          </Link>
        </div>
      </div>

      {error && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">
          Could not load reports: {error.message}
        </p>
      )}

      <ul className="mt-6 divide-y divide-zinc-200 dark:divide-zinc-800">
        {reports?.map((report) => {
          // Supabase's TS inference can't tell this embedded relation is
          // to-one (no generated Database types wired up), so it types
          // `students` as an array even though the query returns an object.
          const student = report.students as unknown as {
            first_name: string;
            last_name: string;
          };
          return (
          <li key={report.id} className="flex items-center justify-between py-3">
            <Link
              href={`/reports/${report.id}`}
              className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
            >
              {student.last_name}, {student.first_name}
              <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                {report.lesson_date}
                {report.class_level && ` · ${report.class_level}`}
              </span>
            </Link>
            <span
              className={
                report.status === "final"
                  ? "rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300"
                  : "rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }
            >
              {report.status === "final" ? "Final" : "Draft"}
            </span>
          </li>
          );
        })}
        {reports?.length === 0 && (
          <li className="py-6 text-sm text-zinc-500 dark:text-zinc-400">
            No reports yet — create your first one above.
          </li>
        )}
      </ul>
    </div>
  );
}
