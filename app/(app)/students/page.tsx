import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Student } from "@/lib/types";
import { setStudentActive } from "./actions";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archived?: string }>;
}) {
  const { q, archived } = await searchParams;
  const showArchived = archived === "1";

  const supabase = await createClient();
  let query = supabase
    .from("students")
    .select("*")
    .eq("is_active", !showArchived)
    .order("last_name", { ascending: true });

  if (q) {
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
  }

  const { data: students, error } = await query;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Students
        </h1>
        <Link
          href="/students/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Add student
        </Link>
      </div>

      <form className="mt-4 flex items-center gap-3" action="/students">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name..."
          className="w-64 rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
        {showArchived && <input type="hidden" name="archived" value="1" />}
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
        >
          Search
        </button>
        <Link
          href={showArchived ? "/students" : "/students?archived=1"}
          className="ml-auto text-sm text-zinc-500 underline hover:text-zinc-800 dark:text-zinc-400"
        >
          {showArchived ? "Show active students" : "Show archived students"}
        </Link>
      </form>

      {error && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">
          Could not load students: {error.message}
        </p>
      )}

      <ul className="mt-6 divide-y divide-zinc-200 dark:divide-zinc-800">
        {students?.map((student: Student) => (
          <li
            key={student.id}
            className="flex items-center justify-between py-3"
          >
            <Link
              href={`/students/${student.id}`}
              className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
            >
              {student.last_name}, {student.first_name}
              {student.grade_level && (
                <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                  {student.grade_level}
                </span>
              )}
            </Link>
            <form
              action={setStudentActive.bind(
                null,
                student.id,
                showArchived,
              )}
            >
              <button
                type="submit"
                className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:text-zinc-400"
              >
                {showArchived ? "Restore" : "Archive"}
              </button>
            </form>
          </li>
        ))}
        {students?.length === 0 && (
          <li className="py-6 text-sm text-zinc-500 dark:text-zinc-400">
            {showArchived
              ? "No archived students."
              : "No students yet — add your first one above."}
          </li>
        )}
      </ul>
    </div>
  );
}
