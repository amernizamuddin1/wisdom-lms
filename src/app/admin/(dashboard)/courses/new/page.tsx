import { requireAdmin } from "@/lib/auth";
import NewCourseForm from "./NewCourseForm";

export default async function NewCoursePage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">New Course</h2>
      <NewCourseForm />
    </div>
  );
}
