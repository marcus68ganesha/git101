import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveTemplate } from "@/lib/reportTemplate";
import ReportForm from "@/components/ReportForm";
import { createReport } from "../actions";

export default async function NewReportPage() {
  const supabase = await createClient();

  const [template, { data: students }, { data: profile }] = await Promise.all([
    getActiveTemplate(supabase),
    supabase
      .from("students")
      .select("id, first_name, last_name")
      .eq("is_active", true)
      .order("last_name", { ascending: true }),
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return { data: null };
      return supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
    }),
  ]);

  if (!template) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          New progress report
        </h1>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          No active report template found. Run the Phase 2 database
          migration first, or check{" "}
          <Link href="/reports/template" className="underline">
            the template editor
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        New progress report
      </h1>
      <div className="mt-6">
        <ReportForm
          template={template}
          action={createReport}
          submitLabel="Save report"
          students={students ?? []}
          initialHeader={{
            lesson_date: new Date().toISOString().slice(0, 10),
            class_level: null,
            teacher_name: profile?.full_name ?? null,
            duration_text: null,
          }}
        />
      </div>
    </div>
  );
}
