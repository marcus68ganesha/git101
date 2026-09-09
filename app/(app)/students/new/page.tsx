import StudentForm from "@/components/StudentForm";
import { createStudent } from "../actions";

export default function NewStudentPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Add student
      </h1>
      <div className="mt-6">
        <StudentForm action={createStudent} submitLabel="Add student" />
      </div>
    </div>
  );
}
