import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { quizSchema } from "@/lib/validation";
import { one, run } from "@/lib/db";
import { QUIZ_SEED } from "@/lib/constants";
import { authorizeApi, apiError, clientIp, enforceSameOrigin, rateLimit } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { nowIso } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const originError = enforceSameOrigin(req);
  if (originError) return originError;
  const auth = await authorizeApi(["student"]);
  if (auth.response) return auth.response;
  const user = auth.user;

  if (!(await rateLimit(`quiz:${user.id}:${clientIp(req)}`, 20, 60 * 60 * 1000)).allowed) {
    return apiError("Too many quiz attempts. Please try again later.", 429);
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return apiError("Invalid request.");
  }
  const parsed = quizSchema.safeParse(json);
  if (!parsed.success) return apiError("Check your quiz answers.");
  const quiz = QUIZ_SEED.find((item) => item.id === parsed.data.quizId);
  if (!quiz) return apiError("Quiz not found.", 404);
  if (parsed.data.answers.length !== quiz.questions.length) {
    return apiError("Please answer every question.");
  }

  const previous = await one<{ score: number; total: number; points_awarded: number }>(
    "SELECT score, total, points_awarded FROM quiz_attempts WHERE quiz_id = ? AND user_id = ?",
    quiz.id,
    user.id,
  );
  if (previous) {
    return NextResponse.json({
      ok: true,
      alreadyCompleted: true,
      score: previous.score,
      total: previous.total,
      pointsAwarded: previous.points_awarded,
      message: "You have already completed this quiz.",
    });
  }

  let score = 0;
  const results = quiz.questions.map((question, index) => {
    const correct = parsed.data.answers[index] === question.answer;
    if (correct) score += 1;
    return { correct, answer: question.answer, explanation: question.explanation };
  });
  const passed = score >= Math.ceil(quiz.questions.length / 2);
  const points = passed ? quiz.points : 0;

  if (passed) {
    await run(
      `INSERT INTO quiz_attempts (id, quiz_id, user_id, score, total, points_awarded, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      randomUUID(),
      quiz.id,
      user.id,
      score,
      quiz.questions.length,
      points,
      nowIso(),
    );
  }
  if (points > 0) {
    await run(
      `INSERT OR IGNORE INTO leaderboard_points (id, user_id, points, reason, quiz_id, is_demo, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      randomUUID(),
      user.id,
      points,
      `Completed ${quiz.title} quiz`,
      quiz.id,
      nowIso(),
    );
  }
  await logAudit({
    actor: user,
    action: "Completed an environmental awareness quiz",
    entityType: "quiz",
    entityId: quiz.id,
    details: `${score}/${quiz.questions.length} · ${points} points`,
    ip: clientIp(req),
  });

  return NextResponse.json({
    ok: true,
    alreadyCompleted: false,
    score,
    total: quiz.questions.length,
    pointsAwarded: points,
    results,
    message: passed ? `You scored ${score}/${quiz.questions.length} and earned ${points} points.` : `You scored ${score}/${quiz.questions.length}. Review the explanations and try another quiz.`,
  });
}
