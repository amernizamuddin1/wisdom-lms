import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewQuizForm from "./NewQuizForm";

export default async function NewQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ chapterId?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { chapterId } = await searchParams;

  const chapters = await prisma.chapter.findMany({
    where: { courseId: id },
    orderBy: { order: "asc" },
    select: { id: true, title: true },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">New Quiz</h2>
      <NewQuizForm courseId={id} chapters={chapters} defaultChapterId={chapterId} />
    </div>
  );
}
