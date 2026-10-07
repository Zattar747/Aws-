import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPlayerFromToken, bearerToken, AuthError } from "@/lib/players";
import { completeGamePlayUnchecked } from "@/lib/game-plays";
import { getQuestionForDisplay, isValidOptionOrder } from "@/lib/trivia-session";
import { triviaQuestionPoints } from "@/lib/points";
import { QUESTION_DURATION_MS } from "@/lib/trivia-questions";

export const runtime = "nodejs";

interface SessionRow {
  id: string;
  player_key: string;
  question_order_json: string;
  option_orders_json: string;
  current_index: number;
  score: number;
  question_started_at: number;
  status: string;
}

export async function POST(req: NextRequest) {
  try {
    const player = await getPlayerFromToken(bearerToken(req));
    const body = await req.json().catch(() => null);
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
    const questionIndex = Number.isInteger(body?.questionIndex) ? body.questionIndex : -1;
    const chosenIndex = body?.chosenIndex; // number 0-3, or null/undefined if timed out

    const db = await getDb();
    const result = await db.execute({
      sql: "SELECT * FROM trivia_sessions WHERE id = ?",
      args: [sessionId],
    });
    const session = result.rows[0] as unknown as SessionRow | undefined;

    if (!session || session.player_key !== player.nameKey) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    if (session.status !== "in_progress" || questionIndex !== session.current_index) {
      return NextResponse.json({ error: "This question is no longer active." }, { status: 400 });
    }

    const questionOrder: number[] = JSON.parse(session.question_order_json);
    const optionOrders: number[][] = JSON.parse(session.option_orders_json);
    const optionOrder = optionOrders[questionIndex];
    if (!isValidOptionOrder(optionOrder)) {
      return NextResponse.json({ error: "Corrupted session." }, { status: 500 });
    }

    const display = getQuestionForDisplay(questionOrder[questionIndex], optionOrder);
    const correct = typeof chosenIndex === "number" && chosenIndex === display.correctDisplayIndex;
    const earned = triviaQuestionPoints(display.difficulty, correct);
    const newScore = session.score + earned;

    const nextIndex = questionIndex + 1;
    const isLast = nextIndex >= questionOrder.length;

    if (isLast) {
      const updateResult = await db.execute({
        sql: `UPDATE trivia_sessions SET score = ?, status = 'done'
              WHERE id = ? AND status = 'in_progress' AND current_index = ?`,
        args: [newScore, sessionId, questionIndex],
      });
      if (updateResult.rowsAffected === 0) {
        return NextResponse.json({ error: "This question is no longer active." }, { status: 400 });
      }
      // The guarded UPDATE above already proved we're the sole owner of this
      // completion (only one concurrent request can win current_index =
      // questionIndex on an 'in_progress' session) — trivia/answer is the
      // only caller that ever completes the trivia game_plays row, so
      // there's no other path that could race this specific completion.
      // completeGamePlay's own guard-then-check round trip would just be
      // re-confirming that, so skip straight to the unchecked batch.
      const totalPoints = await completeGamePlayUnchecked(player.nameKey, "trivia", newScore);
      return NextResponse.json({
        correct,
        correctIndex: display.correctDisplayIndex,
        explanation: display.explanation,
        pointsEarned: earned,
        totalScore: newScore,
        done: true,
        totalPoints,
      });
    }

    const updateResult = await db.execute({
      sql: `UPDATE trivia_sessions SET score = ?, current_index = ?, question_started_at = ?
            WHERE id = ? AND status = 'in_progress' AND current_index = ?`,
      args: [newScore, nextIndex, Date.now(), sessionId, questionIndex],
    });
    if (updateResult.rowsAffected === 0) {
      return NextResponse.json({ error: "This question is no longer active." }, { status: 400 });
    }

    const nextDisplay = getQuestionForDisplay(questionOrder[nextIndex], optionOrders[nextIndex]);
    return NextResponse.json({
      correct,
      correctIndex: display.correctDisplayIndex,
      explanation: display.explanation,
      pointsEarned: earned,
      totalScore: newScore,
      done: false,
      nextQuestion: {
        index: nextIndex,
        text: nextDisplay.question,
        options: nextDisplay.options,
        difficulty: nextDisplay.difficulty,
      },
      durationMs: QUESTION_DURATION_MS,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
