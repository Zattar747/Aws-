import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getNextWord } from "@/lib/words";
import { getOrCreatePlayer } from "@/lib/players";

export const runtime = "nodejs";

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

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
  const id = randomUUID();
  const word = await getNextWord();
  const startedAt = Date.now();

  await db.execute({
    sql: `INSERT INTO wordle_games (id, player_key, word, guesses_json, status, started_at)
          VALUES (?, ?, ?, '[]', 'in_progress', ?)`,
    args: [id, player.nameKey, word, startedAt],
  });

  return NextResponse.json({
    gameId: id,
    wordLength: WORD_LENGTH,
    maxGuesses: MAX_GUESSES,
    player,
  });
}
