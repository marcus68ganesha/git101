import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentForm from "@/components/StudentForm";
import { updateStudent } from "../../actions";

export default async function EditStudentPage({
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
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Edit {student.first_name} {student.last_name}
      </h1>
      <div className="mt-6">
        <StudentForm
          action={updateStudent.bind(null, studentId)}
          student={student}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
