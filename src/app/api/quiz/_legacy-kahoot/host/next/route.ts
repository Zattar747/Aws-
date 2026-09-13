import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { QUIZ_QUESTIONS } from "@/lib/quiz-questions";
import type { QuizGameRow } from "@/lib/quiz-session";
import { awardPoints } from "@/lib/players";

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
  if (game.status !== "reveal") {
    return NextResponse.json({ error: "Reveal the current question first." }, { status: 400 });
  }

  const next = game.current_question + 1;

  if (next >= QUIZ_QUESTIONS.length) {
    db.prepare(
      "UPDATE quiz_games SET status = 'ended', finished_at = ? WHERE id = ?"
    ).run(Date.now(), gameId);

    const players = db
      .prepare("SELECT player_key, score FROM quiz_players WHERE game_id = ?")
      .all(gameId) as { player_key: string; score: number }[];

    for (const p of players) {
      const points = Math.max(p.score, 5); // participation floor, like the other games
      awardPoints(db, p.player_key, "quiz-live", points, `final score ${p.score}`);
    }

    return NextResponse.json({ ok: true, ended: true });
  }

  db.prepare(
    `UPDATE quiz_games SET status = 'question', current_question = ?, question_started_at = ? WHERE id = ?`
  ).run(next, Date.now(), gameId);

  return NextResponse.json({ ok: true, ended: false });
}
