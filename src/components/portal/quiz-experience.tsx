"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, RotateCcw, Sparkles, Trophy, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { postJson } from "@/lib/client-api";
import { QUIZ_SEED } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Attempt {
  score: number;
  total: number;
  points_awarded: number;
}

interface QuizResult {
  score: number;
  total: number;
  pointsAwarded: number;
  alreadyCompleted?: boolean;
  results?: Array<{ correct: boolean; answer: number; explanation: string }>;
}

type QuizDefinition = (typeof QUIZ_SEED)[number];

export function QuizExperience({ attempts }: { attempts: Record<string, Attempt> }) {
  const router = useRouter();
  const [active, setActive] = useState<QuizDefinition | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [saving, setSaving] = useState(false);

  function start(quiz: QuizDefinition) {
    setActive(quiz);
    setIndex(0);
    setAnswers(new Array(quiz.questions.length).fill(-1));
    setResult(null);
  }

  function choose(option: number) {
    if (!active) return;
    setAnswers((prev) => prev.map((value, idx) => (idx === index ? option : value)));
  }

  async function submit() {
    if (!active) return;
    if (answers.some((answer) => answer < 0)) {
      toast.error("Answer every question before submitting.");
      return;
    }
    setSaving(true);
    try {
      const data = await postJson<QuizResult>("/api/quiz", { quizId: active.id, answers });
      setResult(data);
      if (data.pointsAwarded > 0) toast.success(`You earned ${data.pointsAwarded} green points.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit the quiz.");
    } finally {
      setSaving(false);
    }
  }

  if (active) {
    const question = active.questions[index];
    const currentAttempt = attempts[active.id];
    const score = active.questions.reduce(
      (sum, item, idx) => sum + (answers[idx] === item.answer ? 1 : 0),
      0,
    );

    if (result) {
      return (
        <div className="surface p-5 sm:p-7">
          <div className="text-center">
            <span
              className={cn(
                "mx-auto flex h-16 w-16 items-center justify-center rounded-2xl",
                result.score === result.total
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : result.pointsAwarded > 0
                    ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
              )}
            >
              <Trophy className="h-8 w-8" />
            </span>
            <h2 className="mt-3 font-display text-2xl font-semibold">
              {result.score}/{result.total} correct
            </h2>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">
              {result.pointsAwarded > 0
                ? `You earned ${result.pointsAwarded} green points for ${active.title}.`
                : "No points this time. Review the explanations, then try another quiz."}
            </p>
            <Progress value={(result.score / result.total) * 100} className="mx-auto mt-4 max-w-sm" />
          </div>

          <div className="mt-6 space-y-3">
            {active.questions.map((item, idx) => {
              const detail = result.results?.[idx];
              const selected = answers[idx];
              return (
                <div key={item.q} className="rounded-xl border p-4">
                  <div className="flex items-start gap-2">
                    {detail?.correct ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {idx + 1}. {item.q}
                      </p>
                      <p className="mt-1 text-[11px] text-ink-500">
                        Your answer: <strong>{item.options[selected] ?? "Not answered"}</strong>
                        {!detail?.correct ? ` · Correct: ${item.options[item.answer]}` : null}
                      </p>
                      <p className="mt-1.5 rounded-lg bg-emerald-500/[0.06] p-2 text-[11px] leading-5 text-emerald-900/80 dark:text-emerald-200/80">
                        {item.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => setActive(null)}>
              <ArrowLeft className="h-4 w-4" /> Back to quizzes
            </Button>
            {result.pointsAwarded === 0 && !currentAttempt ? (
              <Button onClick={() => start(active)}>
                <RotateCcw className="h-4 w-4" /> Try again
              </Button>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div className="surface p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone="emerald">
            <CircleHelp className="h-3 w-3" /> {active.title}
          </Badge>
          <span className="text-[11px] font-semibold text-ink-400">
            Question {index + 1} of {active.questions.length}
          </span>
        </div>
        <Progress value={((index + 1) / active.questions.length) * 100} className="mt-3" />
        <h2 className="mt-5 font-display text-xl font-semibold leading-snug">
          {index + 1}. {question.q}
        </h2>
        <div className="mt-5 space-y-2">
          {question.options.map((option, optionIndex) => (
            <button
              key={option}
              type="button"
              onClick={() => choose(optionIndex)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition",
                answers[index] === optionIndex
                  ? "border-emerald-500/60 bg-emerald-500/10 font-semibold text-emerald-900 dark:text-emerald-200"
                  : "hover:border-emerald-500/30 hover:bg-emerald-500/[0.03]",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                  answers[index] === optionIndex
                    ? "border-emerald-600 bg-emerald-500 text-white"
                    : "text-ink-400",
                )}
              >
                {String.fromCharCode(65 + optionIndex)}
              </span>
              {option}
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <Button
            variant="ghost"
            onClick={() => (index === 0 ? setActive(null) : setIndex((prev) => prev - 1))}
          >
            <ArrowLeft className="h-4 w-4" /> {index === 0 ? "Exit quiz" : "Previous"}
          </Button>
          {index < active.questions.length - 1 ? (
            <Button onClick={() => setIndex((prev) => prev + 1)} disabled={answers[index] < 0}>
              Next question <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} loading={saving} disabled={answers.some((answer) => answer < 0)}>
              <Sparkles className="h-4 w-4" /> Submit answers
            </Button>
          )}
        </div>
        <p className="mt-3 text-center text-[10px] text-ink-400">
          Quiz feedback is educational. Current score preview: {score}/{active.questions.length} correct.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {QUIZ_SEED.map((quiz) => {
        const attempt = attempts[quiz.id];
        return (
          <div key={quiz.id} className="surface flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <CircleHelp className="h-5 w-5" />
              </span>
              <Badge tone={attempt ? "emerald" : "amber"}>{attempt ? "Completed" : `+${quiz.points} points`}</Badge>
            </div>
            <h3 className="mt-3 font-display text-base font-semibold">{quiz.title}</h3>
            <p className="mt-1 flex-1 text-xs leading-5 text-ink-500 dark:text-ink-300">{quiz.description}</p>
            <p className="mt-3 text-[10px] text-ink-400">
              {quiz.questions.length} questions · {attempt ? `${attempt.score}/${attempt.total} correct` : "not attempted"}
            </p>
            <Button
              className="mt-4"
              variant={attempt ? "outline" : "primary"}
              onClick={() => start(quiz)}
              disabled={Boolean(attempt)}
            >
              {attempt ? "Already completed" : "Start quiz"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
