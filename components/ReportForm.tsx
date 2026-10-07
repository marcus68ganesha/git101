"use client";

import { useActionState } from "react";
import type {
  ReportAnswer,
  Student,
  TemplateWithItems,
} from "@/lib/types";
import type { ReportFormState } from "@/app/(app)/reports/actions";

type ReportFormAction = (
  state: ReportFormState,
  formData: FormData,
) => Promise<ReportFormState>;

export default function ReportForm({
  template,
  action,
  submitLabel,
  students,
  fixedStudentName,
  initialHeader,
  existingAnswers,
}: {
  template: TemplateWithItems;
  action: ReportFormAction;
  submitLabel: string;
  students?: Pick<Student, "id" | "first_name" | "last_name">[];
  fixedStudentName?: string;
  initialHeader?: {
    lesson_date: string;
    class_level: string | null;
    teacher_name: string | null;
    duration_text: string | null;
  };
  existingAnswers?: Map<string, ReportAnswer>;
}) {
  const [state, formAction, pending] = useActionState<ReportFormState, FormData>(
    action,
    undefined,
  );

  const scoring = template.report_template_items.filter(
    (i) => i.section === "scoring",
  );
  const observation = template.report_template_items.filter(
    (i) => i.section === "observation",
  );
  const notes = template.report_template_items.filter(
    (i) => i.section === "notes",
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-8">
      <section className="grid grid-cols-2 gap-4">
        {students ? (
          <label className="col-span-2 flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Student
            </span>
            <select
              name="student_id"
              required
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="">Select a student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.last_name}, {s.first_name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="col-span-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Student
            </span>
            <p className="text-sm text-zinc-900 dark:text-zinc-50">
              {fixedStudentName}
            </p>
          </div>
        )}

        <Field
          label="Date"
          name="lesson_date"
          type="date"
          defaultValue={
            initialHeader?.lesson_date ?? new Date().toISOString().slice(0, 10)
          }
        />
        <Field
          label="Class level"
          name="class_level"
          defaultValue={initialHeader?.class_level ?? ""}
        />
        <Field
          label="Teacher name"
          name="teacher_name"
          defaultValue={initialHeader?.teacher_name ?? ""}
        />
        <Field
          label="Duration"
          name="duration_text"
          placeholder="e.g. 45 minutes"
          defaultValue={initialHeader?.duration_text ?? ""}
        />
      </section>

      <ItemSection title="Scoring" items={scoring} existingAnswers={existingAnswers} />
      <ItemSection
        title="Observation"
        items={observation}
        existingAnswers={existingAnswers}
      />
      <ItemSection title="Notes" items={notes} existingAnswers={existingAnswers} />

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

function ItemSection({
  title,
  items,
  existingAnswers,
}: {
  title: string;
  items: TemplateWithItems["report_template_items"];
  existingAnswers?: Map<string, ReportAnswer>;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <div className="mt-3 flex flex-col gap-5">
        {items.map((item) => {
          const existing = existingAnswers?.get(item.id);
          const fieldName = `item_${item.id}`;

          return (
            <div key={item.id}>
              <label
                htmlFor={fieldName}
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                {item.label}
                {item.item_type === "score" && ` (out of ${item.max_score})`}
              </label>
              {item.helper_text && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {item.helper_text}
                </p>
              )}

              {item.item_type === "score" && (
                <input
                  id={fieldName}
                  name={fieldName}
                  type="number"
                  min={0}
                  max={item.max_score ?? undefined}
                  defaultValue={existing?.score_value ?? ""}
                  className="mt-1 w-24 rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
                />
              )}

              {item.item_type === "single_choice" && (
                <div className="mt-1 flex flex-col gap-1.5">
                  {item.report_template_options.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      <input
                        type="radio"
                        name={fieldName}
                        value={option.id}
                        defaultChecked={
                          existing?.selected_option_id === option.id
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              )}

              {item.item_type === "open_text" && (
                <textarea
                  id={fieldName}
                  name={fieldName}
                  rows={2}
                  defaultValue={existing?.text_value ?? ""}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
      />
    </label>
  );
}
