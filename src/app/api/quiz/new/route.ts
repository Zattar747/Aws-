import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/players";
import { QUESTION_DURATION_MS, QUIZ_QUESTIONS } from "@/lib/quiz-questions";
import { buildOptionOrders, getQuestionForDisplay } from "@/lib/quiz-session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const playerName = typeof body?.playerName === "string" ? body.playerName.trim() : "";

  if (!playerName || playerName.length > 30) {
    return NextResponse.json(
      { error: "Enter a name (1-30 characters) to start playing." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const player = await getOrCreatePlayer(playerName);
  const optionOrders = buildOptionOrders();
  const id = randomUUID();
  const now = Date.now();

  await db.execute({
    sql: `INSERT INTO quiz_sessions
            (id, player_key, option_orders_json, current_question, question_started_at, score, status, started_at)
          VALUES (?, ?, ?, 0, ?, 0, 'in_progress', ?)`,
    args: [id, player.nameKey, JSON.stringify(optionOrders), now, now],
  });

  const q = getQuestionForDisplay(0, optionOrders);

  return NextResponse.json({
    sessionId: id,
    player,
    totalQuestions: QUIZ_QUESTIONS.length,
    durationMs: QUESTION_DURATION_MS,
    question: {
      index: 0,
      text: q.question,
      options: q.options,
    },
  });
}
