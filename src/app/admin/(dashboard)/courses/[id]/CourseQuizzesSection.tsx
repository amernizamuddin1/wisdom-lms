import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CourseQuizzesSection({
  courseId,
  quizzes,
}: {
  courseId: string;
  quizzes: { id: string; title: string }[];
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Course-Level Quizzes</CardTitle>
        <Link
          href={`/admin/courses/${courseId}/quizzes/new`}
          className="text-sm text-primary hover:underline"
        >
          Add Quiz
        </Link>
      </CardHeader>
      <CardContent>
        {quizzes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No course-level quizzes yet.</p>
        ) : (
          <ul className="space-y-1">
            {quizzes.map((quiz) => (
              <li key={quiz.id}>
                <Link
                  href={`/admin/courses/${courseId}/quizzes/${quiz.id}`}
                  className="text-sm text-foreground hover:underline"
                >
                  {quiz.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
