"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { QuestionType } from "@/generated/prisma/client";
import {
  upsertQuestion,
  deleteQuestion,
  reorderQuestions,
  type QuestionActionState,
  type QuestionData,
} from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Question = QuestionData;

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Single choice",
  MULTIPLE_CHOICE: "Multiple choice",
  TRUE_FALSE: "True / False",
  FILL_BLANK: "Fill in the blank",
};

export default function QuestionsSection({
  courseId,
  quizId,
  initialQuestions,
}: {
  courseId: string;
  quizId: string;
  initialQuestions: Question[];
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setQuestions((prev) => {
      const oldIndex = prev.findIndex((q) => q.id === active.id);
      const newIndex = prev.findIndex((q) => q.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      startTransition(() => {
        reorderQuestions(
          courseId,
          quizId,
          next.map((q) => q.id),
        );
      });
      return next;
    });
  }

  async function handleDelete(questionId: string) {
    if (!confirm("Delete this question?")) return;
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    await deleteQuestion(courseId, quizId, questionId);
    toast.success("Question deleted.");
  }

  function handleSaved(saved: Question) {
    setQuestions((prev) => {
      const exists = prev.some((q) => q.id === saved.id);
      return exists ? prev.map((q) => (q.id === saved.id ? saved : q)) : [...prev, saved];
    });
    setAddingNew(false);
    setEditingId(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Questions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <DndContext
          id="questions-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {questions.map((question) =>
                editingId === question.id ? (
                  <li key={question.id}>
                    <QuestionEditor
                      courseId={courseId}
                      quizId={quizId}
                      initial={question}
                      onSaved={handleSaved}
                      onCancel={() => setEditingId(null)}
                    />
                  </li>
                ) : (
                  <QuestionRow
                    key={question.id}
                    question={question}
                    onEdit={() => setEditingId(question.id)}
                    onDelete={() => handleDelete(question.id)}
                  />
                ),
              )}
            </ul>
          </SortableContext>
        </DndContext>

        {addingNew ? (
          <QuestionEditor
            courseId={courseId}
            quizId={quizId}
            onSaved={handleSaved}
            onCancel={() => setAddingNew(false)}
          />
        ) : (
          <Button variant="outline" onClick={() => setAddingNew(true)}>
            Add Question
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function QuestionRow({
  question,
  onEdit,
  onDelete,
}: {
  question: Question;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: question.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li ref={setNodeRef} style={style} className="rounded-md border px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab text-muted-foreground hover:text-foreground"
            aria-label="Drag to reorder question"
          >
            ⠿
          </button>
          <div>
            <p className="text-sm font-medium text-foreground">{question.questionText}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {QUESTION_TYPE_LABELS[question.questionType]}
            </p>
            <QuestionAnswerSummary question={question} />
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </li>
  );
}

function QuestionAnswerSummary({ question }: { question: Question }) {
  if (question.questionType === "FILL_BLANK") {
    return (
      <p className="mt-1 text-xs text-success">
        Accepted answer: <span className="font-medium">{question.correctAnswerText}</span>
      </p>
    );
  }

  if (question.questionType === "TRUE_FALSE") {
    const answer = question.correctOptions?.[0] === "true" ? "True" : "False";
    return (
      <p className="mt-1 text-xs text-success">
        Answer: <span className="font-medium">{answer}</span>
      </p>
    );
  }

  const correct = question.correctOptions ?? [];
  return (
    <ul className="mt-1 space-y-0.5">
      {(question.options ?? []).map((opt) => (
        <li
          key={opt}
          className={`text-xs ${
            correct.includes(opt)
              ? "font-medium text-success"
              : "text-muted-foreground"
          }`}
        >
          {correct.includes(opt) ? "✓ " : "— "}
          {opt}
        </li>
      ))}
    </ul>
  );
}

function QuestionEditor({
  courseId,
  quizId,
  initial,
  onSaved,
  onCancel,
}: {
  courseId: string;
  quizId: string;
  initial?: Question;
  onSaved: (q: Question) => void;
  onCancel: () => void;
}) {
  const [questionType, setQuestionType] = useState<QuestionType>(
    initial?.questionType ?? "SINGLE_CHOICE",
  );
  const [questionText, setQuestionText] = useState(initial?.questionText ?? "");
  const [options, setOptions] = useState<string[]>(initial?.options ?? ["", ""]);
  const [correctOption, setCorrectOption] = useState(initial?.correctOptions?.[0] ?? "");
  const [correctOptions, setCorrectOptions] = useState<string[]>(
    initial?.questionType === "MULTIPLE_CHOICE" ? (initial?.correctOptions ?? []) : [],
  );
  const [trueFalseAnswer, setTrueFalseAnswer] = useState(
    initial?.questionType === "TRUE_FALSE" ? (initial?.correctOptions?.[0] ?? "true") : "true",
  );
  const [answerText, setAnswerText] = useState(initial?.correctAnswerText ?? "");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");

  const action = upsertQuestion.bind(null, courseId, quizId);
  const [state, formAction, pending] = useActionState(
    async (prevState: QuestionActionState, formData: FormData) => {
      const result = await action(prevState, formData);
      if (result.question) {
        onSaved(result.question);
        toast.success("Question saved.");
      } else if (result.error) {
        toast.error(result.error);
      }
      return result;
    },
    {} as QuestionActionState,
  );

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOption() {
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleCorrectOption(opt: string) {
    setCorrectOptions((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt],
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-md border bg-muted/40 p-3">
      {initial && <input type="hidden" name="questionId" value={initial.id} />}

      <div className="space-y-1.5">
        <Label>Question type</Label>
        <Select
          name="questionType"
          value={questionType}
          onValueChange={(value) => setQuestionType(value as QuestionType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Question</Label>
        <Input
          name="questionText"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          required
        />
      </div>

      {questionType === "SINGLE_CHOICE" && (
        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correctOption"
                value={opt}
                checked={correctOption === opt && opt !== ""}
                onChange={() => setCorrectOption(opt)}
              />
              <Input
                name="options"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                required
                className="flex-1"
              />
              {options.length > 2 && (
                <Button type="button" variant="ghost" size="xs" onClick={() => removeOption(i)}>
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="link" className="h-auto p-0" onClick={addOption}>
            Add option
          </Button>
          <p className="text-xs text-muted-foreground">Select the radio next to the correct option.</p>
        </div>
      )}

      {questionType === "MULTIPLE_CHOICE" && (
        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                name="correctOptions"
                value={opt}
                checked={opt !== "" && correctOptions.includes(opt)}
                disabled={opt === ""}
                onChange={() => toggleCorrectOption(opt)}
              />
              <Input
                name="options"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                required
                className="flex-1"
              />
              {options.length > 2 && (
                <Button type="button" variant="ghost" size="xs" onClick={() => removeOption(i)}>
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="link" className="h-auto p-0" onClick={addOption}>
            Add option
          </Button>
          <p className="text-xs text-muted-foreground">Check every correct option.</p>
        </div>
      )}

      {questionType === "TRUE_FALSE" && (
        <div className="space-y-2">
          <Label>Correct answer</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="correctOption"
                value="true"
                checked={trueFalseAnswer === "true"}
                onChange={() => setTrueFalseAnswer("true")}
              />
              True
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="correctOption"
                value="false"
                checked={trueFalseAnswer === "false"}
                onChange={() => setTrueFalseAnswer("false")}
              />
              False
            </label>
          </div>
        </div>
      )}

      {questionType === "FILL_BLANK" && (
        <div className="space-y-1.5">
          <Label>Accepted answer</Label>
          <Input
            name="correctAnswerText"
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Matching ignores case and extra spaces when the student answers.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Explanation (optional)</Label>
        <Textarea
          name="explanation"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          Shown only on the student&apos;s final results screen next to this question — never
          during the quiz itself.
        </p>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save Question"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
