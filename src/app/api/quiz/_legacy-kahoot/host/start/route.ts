import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import type { QuizGameRow } from "@/lib/quiz-session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const gameId = typeof body?.gameId === "string" ? body.gameId : "";

  const game = db.prepare("SELECT * FROM quiz_games WHERE id = ?").get(gameId) as
    | QuizGameRow
    | undefined;

  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }
  if (game.status !== "lobby") {
    return NextResponse.json({ error: "Game already started." }, { status: 400 });
  }

  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM quiz_players WHERE game_id = ?")
    .get(gameId) as { count: number };

  if (count === 0) {
    return NextResponse.json(
      { error: "Wait for at least one player to join." },
      { status: 400 }
    );
  }

  db.prepare(
    `UPDATE quiz_games SET status = 'question', current_question = 0, question_started_at = ? WHERE id = ?`
  ).run(Date.now(), gameId);

  return NextResponse.json({ ok: true });
}
