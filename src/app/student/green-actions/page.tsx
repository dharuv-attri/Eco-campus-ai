import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Leaf, ListChecks, Sparkles, Trophy } from "lucide-react";
import { PageHeader } from "@/components/portal/portal-shell";
import { QuizExperience } from "@/components/portal/quiz-experience";
import { StatCard } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { getStudentStats } from "@/lib/analytics";
import { all } from "@/lib/db";
import { GREEN_CHALLENGES } from "@/lib/constants";
import { formatNumber, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Green actions" };

interface AttemptRow {
  quiz_id: string;
  score: number;
  total: number;
  points_awarded: number;
}

export default async function StudentGreenActionsPage() {
  const user = await requireRole(["student"], "/student/green-actions");
  const stats = await getStudentStats(user.id);
  const attemptRows = await all<AttemptRow>(
    "SELECT quiz_id, score, total, points_awarded FROM quiz_attempts WHERE user_id = ?",
    user.id,
  );
  const attempts = Object.fromEntries(
    attemptRows.map((row) => [
      row.quiz_id,
      { score: row.score, total: row.total, points_awarded: row.points_awarded },
    ]),
  );
  const history = await all<{ id: string; points: number; reason: string; created_at: string }>(
    "SELECT id, points, reason, created_at FROM leaderboard_points WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
    user.id,
  );
  const verifiedActivities = await all<{ id: string; title: string; points: number; activity_date: string | null }>(
    `SELECT ga.id, ga.title, lp.points, ga.activity_date
     FROM leaderboard_points lp JOIN green_activities ga ON ga.id = lp.activity_id
     WHERE lp.user_id = ? ORDER BY ga.activity_date DESC, lp.created_at DESC LIMIT 6`,
    user.id,
  );

  return (
    <>
      <PageHeader
        eyebrow="Green actions"
        title="Learn, act and earn green points"
        description="Complete short environmental quizzes, try practical campus challenges, and collect points for verified sustainability actions."
        action={
          <LinkButton href="/student/leaderboard" variant="outline">
            <Trophy className="h-4 w-4" /> View leaderboard
          </LinkButton>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Green points" value={formatNumber(stats.points)} hint="From verified actions" icon={Sparkles} tone="emerald" />
        <StatCard
          label="Quizzes completed"
          value={`${attemptRows.length}/3`}
          hint="Each quiz can be completed once"
          icon={ListChecks}
          tone="sky"
        />
        <StatCard
          label="Verified activities"
          value={formatNumber(verifiedActivities.length)}
          hint="Recorded by campus administrators"
          icon={Leaf}
          tone="forest"
        />
      </div>

      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Environmental awareness quizzes</h2>
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">
              Score at least half to earn points. Answers are explained after submission.
            </p>
          </div>
        </div>
        <QuizExperience attempts={attempts} />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <section>
          <div className="mb-3">
            <h2 className="font-display text-lg font-semibold">Practical green challenges</h2>
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">
              These are self-guided actions. Points are awarded only when an administrator records and verifies your
              participation in an organised activity.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {GREEN_CHALLENGES.map((challenge) => (
              <div key={challenge.title} className="surface flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <Leaf className="h-4 w-4" />
                  </span>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    +{challenge.points} pts
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold">{challenge.title}</h3>
                <p className="mt-1 flex-1 text-[11px] leading-5 text-ink-500 dark:text-ink-300">
                  {challenge.description}
                </p>
                <p className="mt-3 border-t pt-2 text-[10px] text-ink-400">Suggested action · not auto-verified</p>
              </div>
            ))}
          </div>

          <div className="mt-4 surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Found a problem while taking action?</p>
              <p className="mt-1 text-[11px] leading-5 text-ink-500 dark:text-ink-300">
                Report it with a photo and location. Verified reports earn 20 points.
              </p>
            </div>
            <LinkButton href="/student/reports/new" size="sm">
              Report a problem <ArrowRight className="h-3.5 w-3.5" />
            </LinkButton>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="surface p-5">
            <h2 className="font-display text-base font-semibold">Points history</h2>
            {history.length ? (
              <ul className="mt-3 space-y-2.5">
                {history.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-2 text-xs">
                    <span className="min-w-0">
                      <span className="block text-[11px] font-medium leading-5">{item.reason}</span>
                      <span className="text-[10px] text-ink-400">{timeAgo(item.created_at)}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                      +{item.points}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs leading-5 text-ink-500 dark:text-ink-300">
                No points yet. Complete a quiz above or get a report verified to start.
              </p>
            )}
          </div>

          <div className="surface p-5">
            <h2 className="font-display text-base font-semibold">Verified activities</h2>
            {verifiedActivities.length ? (
              <ul className="mt-3 space-y-2.5">
                {verifiedActivities.map((activity) => (
                  <li key={activity.id} className="rounded-xl border p-3">
                    <p className="text-xs font-semibold">{activity.title}</p>
                    <p className="mt-1 text-[10px] text-ink-400">
                      {activity.activity_date ? timeAgo(activity.activity_date) : "Recorded by administrators"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs leading-5 text-ink-500 dark:text-ink-300">
                When you join a clean-up drive, plantation day or awareness session, organisers can record your
                participation here.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 text-[11px] leading-5 text-emerald-900/80 dark:text-emerald-200/80">
            <p className="font-semibold text-emerald-900 dark:text-emerald-200">How points stay fair</p>
            <ul className="mt-2 space-y-1.5">
              <li>• Verified report: 20 points, once per report.</li>
              <li>• Quiz: 15 points, once per quiz when you pass.</li>
              <li>• Green activity: set by the organiser, verified manually.</li>
            </ul>
            <Link href="/about" className="mt-3 inline-flex items-center gap-1 font-semibold hover:underline">
              About the platform <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
