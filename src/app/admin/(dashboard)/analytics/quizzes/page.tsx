import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveDateRange } from "@/lib/analytics/date-range";
import { getQuizKpis, getScoreDistribution, getQuizPerformanceRows, type QuizFilters } from "@/lib/analytics/quizzes";
import { getQuestionDifficultyRows } from "@/lib/analytics/quiz-difficulty";
import { METRIC_TOOLTIPS } from "@/lib/analytics/definitions";
import AnalyticsFilterBar from "@/components/analytics/AnalyticsFilterBar";
import KpiCard from "@/components/analytics/KpiCard";
import DownloadCsvButton from "@/components/analytics/DownloadCsvButton";
import ScoreDistributionChart from "./ScoreDistributionChart";
import QuizPerformanceTable from "./QuizPerformanceTable";
import QuestionDifficultyTable from "./QuestionDifficultyTable";
import { exportQuizPerformanceCsv, exportQuestionDifficultyCsv } from "./actions";
import { ClipboardCheckIcon, UsersIcon, TargetIcon, CheckCircle2Icon, XCircleIcon, StarIcon, RepeatIcon } from "lucide-react";

type SearchParams = { range?: string; from?: string; to?: string; courseId?: string; quizId?: string };

export default async function QuizAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const range = resolveDateRange(params);
  const courseId = params.courseId && params.courseId !== "all" ? params.courseId : null;
  const quizId = params.quizId && params.quizId !== "all" ? params.quizId : null;
  const filters: QuizFilters = { range, courseId, quizId };

  const [kpis, distribution, performanceRows, questionRows, courses, quizzes] = await Promise.all([
    getQuizKpis(filters),
    getScoreDistribution(filters),
    getQuizPerformanceRows(filters),
    getQuestionDifficultyRows(filters),
    prisma.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.quiz.findMany({
      where: courseId ? { OR: [{ courseId }, { chapter: { courseId } }] } : {},
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const csvParams = { range: params.range, from: params.from, to: params.to, courseId: params.courseId, quizId: params.quizId };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Quiz &amp; Assessment Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance, scoring, and question-level difficulty.</p>
        </div>
        <div className="flex gap-2">
          <DownloadCsvButton action={exportQuizPerformanceCsv.bind(null, csvParams)} filenamePrefix="quiz-performance" />
          <DownloadCsvButton action={exportQuestionDifficultyCsv.bind(null, csvParams)} filenamePrefix="question-difficulty" />
        </div>
      </div>

      <AnalyticsFilterBar courses={courses} />

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <form method="get" className="flex flex-wrap items-end gap-4">
            <input type="hidden" name="range" value={params.range ?? ""} />
            <input type="hidden" name="from" value={params.from ?? ""} />
            <input type="hidden" name="to" value={params.to ?? ""} />
            <input type="hidden" name="courseId" value={params.courseId ?? ""} />
            <label className="space-y-1.5 text-xs text-muted-foreground">
              Quiz
              <select
                name="quizId"
                defaultValue={params.quizId ?? "all"}
                className="block h-9 w-56 rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="all">All quizzes</option>
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="h-9 rounded-md border border-input px-3 text-sm hover:bg-muted">
              Apply
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Attempts" value={kpis.totalAttempts.toLocaleString()} icon={ClipboardCheckIcon} />
        <KpiCard label="Unique Learners Tested" value={kpis.uniqueLearners.toLocaleString()} icon={UsersIcon} />
        <KpiCard label="Average Score" value={kpis.averageScore === null ? "—" : `${kpis.averageScore}%`} icon={TargetIcon} tooltip={METRIC_TOOLTIPS.averageQuizScore} />
        <KpiCard label="Pass Rate" value={`${kpis.passRate}%`} icon={CheckCircle2Icon} tooltip={METRIC_TOOLTIPS.quizPassRate} />
        <KpiCard label="Failure Rate" value={`${kpis.failureRate}%`} icon={XCircleIcon} />
        <KpiCard label="Perfect Scores" value={kpis.perfectScores.toLocaleString()} icon={StarIcon} />
        <KpiCard
          label="Avg. Attempts to Pass"
          value={kpis.averageAttemptsToPass === null ? "—" : kpis.averageAttemptsToPass}
          icon={RepeatIcon}
          tooltip={METRIC_TOOLTIPS.quizAvgAttemptsToPass}
        />
      </div>

      <ScoreDistributionChart data={distribution} />
      <QuizPerformanceTable rows={performanceRows} />
      <QuestionDifficultyTable rows={questionRows} />
    </div>
  );
}
