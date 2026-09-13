import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { QUESTION_DURATION_MS, QUIZ_QUESTIONS } from "@/lib/quiz-questions";
import { getQuestionForDisplay, type QuizSessionRow } from "@/lib/quiz-session";
import { quizPoints } from "@/lib/points";
import { awardPoints } from "@/lib/players";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const questionIndex = Number.isInteger(body?.questionIndex) ? body.questionIndex : -1;
  const timedOut = body?.timedOut === true;
  const choiceIndex = Number.isInteger(body?.choiceIndex) ? body.choiceIndex : -1;

  const db = await getDb();
  const sessionResult = await db.execute({
    sql: "SELECT * FROM quiz_sessions WHERE id = ?",
    args: [sessionId],
  });
  const session = sessionResult.rows[0] as unknown as QuizSessionRow | undefined;

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }
  if (session.status !== "in_progress" || questionIndex !== session.current_question) {
    return NextResponse.json({ error: "This question is no longer active." }, { status: 400 });
  }
  if (!timedOut && (choiceIndex < 0 || choiceIndex > 3)) {
    return NextResponse.json({ error: "Invalid choice." }, { status: 400 });
  }

  const optionOrders: number[][] = JSON.parse(session.option_orders_json);
  const { correctDisplayIndex } = getQuestionForDisplay(session.current_question, optionOrders);
  const correct = !timedOut && choiceIndex === correctDisplayIndex;

  const remainingMs = Math.max(
    0,
    Math.min(QUESTION_DURATION_MS, session.question_started_at + QUESTION_DURATION_MS - Date.now())
  );
  const pointsEarned = quizPoints(correct, remainingMs, QUESTION_DURATION_MS);
  const newScore = session.score + pointsEarned;

  const nextIndex = session.current_question + 1;
  const isLast = nextIndex >= QUIZ_QUESTIONS.length;

  if (isLast) {
    await db.execute({
      sql: "UPDATE quiz_sessions SET score = ?, status = 'done', finished_at = ? WHERE id = ?",
      args: [newScore, Date.now(), sessionId],
    });

    const finalPointsAwarded = Math.max(newScore, 5); // participation floor, like the other games
    await awardPoints(session.player_key, "quiz", finalPointsAwarded, `final score ${newScore}`);

    return NextResponse.json({
      correct,
      correctIndex: correctDisplayIndex,
      pointsEarned,
      totalScore: newScore,
      done: true,
      finalPointsAwarded,
    });
  }

  const now = Date.now();
  await db.execute({
    sql: "UPDATE quiz_sessions SET score = ?, current_question = ?, question_started_at = ? WHERE id = ?",
    args: [newScore, nextIndex, now, sessionId],
  });

  const nextQ = getQuestionForDisplay(nextIndex, optionOrders);

  return NextResponse.json({
    correct,
    correctIndex: correctDisplayIndex,
    pointsEarned,
    totalScore: newScore,
    done: false,
    nextQuestion: {
      index: nextIndex,
      text: nextQ.question,
      options: nextQ.options,
    },
  });
}
