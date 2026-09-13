import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/players";
import type { QuizGameRow } from "@/lib/quiz-session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
  const playerName = typeof body?.playerName === "string" ? body.playerName.trim() : "";

  if (!pin) {
    return NextResponse.json({ error: "Enter the game PIN." }, { status: 400 });
  }
  if (!playerName || playerName.length > 30) {
    return NextResponse.json({ error: "Enter a name (1-30 characters)." }, { status: 400 });
  }

  const game = db.prepare("SELECT * FROM quiz_games WHERE id = ?").get(pin) as
    | QuizGameRow
    | undefined;

  if (!game) {
    return NextResponse.json({ error: "Game not found. Check the PIN." }, { status: 404 });
  }
  if (game.status !== "lobby") {
    return NextResponse.json({ error: "This game has already started." }, { status: 400 });
  }

  const player = getOrCreatePlayer(db, playerName);

  db.prepare(
    `INSERT INTO quiz_players (id, game_id, player_key, score, joined_at)
     VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(game_id, player_key) DO NOTHING`
  ).run(randomUUID(), pin, player.nameKey, Date.now());

  return NextResponse.json({
    gameId: pin,
    playerKey: player.nameKey,
    displayName: player.displayName,
  });
}
