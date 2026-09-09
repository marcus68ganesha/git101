"use client";

import { useActionState } from "react";
import type { Student } from "@/lib/types";
import type { StudentFormState } from "@/app/(app)/students/actions";

type StudentFormAction = (
  state: StudentFormState,
  formData: FormData,
) => Promise<StudentFormState>;

export default function StudentForm({
  action,
  student,
  submitLabel,
}: {
  action: StudentFormAction;
  student?: Student;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<
    StudentFormState,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" name="first_name" required defaultValue={student?.first_name} />
        <Field label="Last name" name="last_name" required defaultValue={student?.last_name} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Date of birth"
          name="date_of_birth"
          type="date"
          defaultValue={student?.date_of_birth ?? ""}
        />
        <Field
          label="Grade level"
          name="grade_level"
          placeholder="e.g. Grade 3"
          defaultValue={student?.grade_level ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Guardian name"
          name="guardian_name"
          defaultValue={student?.guardian_name ?? ""}
        />
        <Field
          label="Guardian contact"
          name="guardian_contact"
          placeholder="Phone or email"
          defaultValue={student?.guardian_contact ?? ""}
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Notes
        </span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={student?.notes ?? ""}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
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
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
      />
    </label>
  );
}
