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
  if (game.status !== "question") {
    return NextResponse.json({ error: "No active question to reveal." }, { status: 400 });
  }

  db.prepare("UPDATE quiz_games SET status = 'reveal' WHERE id = ?").run(gameId);

  return NextResponse.json({ ok: true });
}
