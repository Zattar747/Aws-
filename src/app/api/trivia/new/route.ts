import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPlayerFromToken, bearerToken, AuthError } from "@/lib/players";
import { assertCanStartGame } from "@/lib/game-plays";
import { QUESTION_DURATION_MS } from "@/lib/trivia-questions";
import { buildQuizSelection, buildOptionOrders, getQuestionForDisplay } from "@/lib/trivia-session";

export const runtime = "nodejs";

interface ExistingSessionRow {
  id: string;
  question_order_json: string;
  option_orders_json: string;
  current_index: number;
  score: number;
  status: string;
}

export async function POST(req: NextRequest) {
  try {
    const player = await getPlayerFromToken(bearerToken(req));

    const { extraResults } = await assertCanStartGame(player.nameKey, "trivia", [
      {
        sql: "SELECT * FROM trivia_sessions WHERE player_key = ? AND status = 'in_progress'",
        args: [player.nameKey],
      },
    ]);
    const existingRow = extraResults[0].rows[0] as unknown as ExistingSessionRow | undefined;

    if (existingRow) {
      const questionOrder: number[] = JSON.parse(existingRow.question_order_json);
      const optionOrders: number[][] = JSON.parse(existingRow.option_orders_json);
      const idx = existingRow.current_index;
      const display = getQuestionForDisplay(questionOrder[idx], optionOrders[idx]);
      return NextResponse.json({
        sessionId: existingRow.id,
        totalQuestions: questionOrder.length,
        durationMs: QUESTION_DURATION_MS,
        question: {
          index: idx,
          text: display.question,
          options: display.options,
          difficulty: display.difficulty,
        },
      });
    }

    const questionOrder = buildQuizSelection();
    const optionOrders = buildOptionOrders(questionOrder.length);
    const id = randomUUID();
    const now = Date.now();

    const db = await getDb();
    await db.batch([
      {
        sql: `INSERT INTO trivia_sessions
                (id, player_key, question_order_json, option_orders_json, current_index, score, question_started_at, status)
              VALUES (?, ?, ?, ?, 0, 0, ?, 'in_progress')`,
        args: [id, player.nameKey, JSON.stringify(questionOrder), JSON.stringify(optionOrders), now],
      },
      {
        sql: `INSERT INTO game_plays (player_key, game, status, points_earned)
              VALUES (?, 'trivia', 'in_progress', 0)
              ON CONFLICT(player_key, game) DO UPDATE SET status = 'in_progress'
              WHERE game_plays.status != 'completed'`,
        args: [player.nameKey],
      },
    ]);

    const display = getQuestionForDisplay(questionOrder[0], optionOrders[0]);
    return NextResponse.json({
      sessionId: id,
      totalQuestions: questionOrder.length,
      durationMs: QUESTION_DURATION_MS,
      question: {
        index: 0,
        text: display.question,
        options: display.options,
        difficulty: display.difficulty,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
