import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;

  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .single();

  if (!student) {
    notFound();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {student.first_name} {student.last_name}
          {!student.is_active && (
            <span className="ml-2 rounded bg-zinc-200 px-2 py-0.5 text-xs font-normal text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Archived
            </span>
          )}
        </h1>
        <Link
          href={`/students/${student.id}/edit`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
        >
          Edit
        </Link>
      </div>

      <dl className="mt-6 grid max-w-lg grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <DetailRow label="Grade level" value={student.grade_level} />
        <DetailRow label="Date of birth" value={student.date_of_birth} />
        <DetailRow label="Guardian" value={student.guardian_name} />
        <DetailRow label="Guardian contact" value={student.guardian_contact} />
      </dl>

      {student.notes && (
        <div className="mt-6 max-w-lg">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Notes
          </h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
            {student.notes}
          </p>
        </div>
      )}

      <div className="mt-8 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Progress reports and lesson history will appear here once those
        features are built (Phases 2–3).
      </div>
    </div>
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
