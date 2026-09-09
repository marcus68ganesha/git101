"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StudentInput } from "@/lib/types";

export type StudentFormState = { error?: string } | undefined;

function readStudentInput(formData: FormData): StudentInput | { error: string } {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();

  if (!firstName || !lastName) {
    return { error: "First and last name are required." };
  }

  const optional = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value.length > 0 ? value : null;
  };

  return {
    first_name: firstName,
    last_name: lastName,
    date_of_birth: optional("date_of_birth"),
    grade_level: optional("grade_level"),
    guardian_name: optional("guardian_name"),
    guardian_contact: optional("guardian_contact"),
    notes: optional("notes"),
  };
}

export async function createStudent(
  _prevState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const input = readStudentInput(formData);
  if ("error" in input) return input;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("students")
    .insert({ ...input, created_by: user?.id ?? null });

  if (error) {
    return { error: "Could not save student. Please try again." };
  }

  revalidatePath("/students");
  redirect("/students");
}

export async function updateStudent(
  studentId: string,
  _prevState: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const input = readStudentInput(formData);
  if ("error" in input) return input;

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update(input)
    .eq("id", studentId);

  if (error) {
    return { error: "Could not save changes. Please try again." };
  }

  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  redirect(`/students/${studentId}`);
}

export async function setStudentActive(studentId: string, isActive: boolean) {
  const supabase = await createClient();
  await supabase
    .from("students")
    .update({ is_active: isActive })
    .eq("id", studentId);

  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
}
