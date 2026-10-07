import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Dashboard
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Head to <Link href="/reports" className="underline">Reports</Link> to
        write a progress report. Lesson plans are coming in Phase 3.
      </p>
    </div>
  );
}
