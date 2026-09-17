import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getNextWord } from "@/lib/words";

export const runtime = "nodejs";

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

export async function POST() {
  const db = await getDb();
  const id = randomUUID();
  const word = await getNextWord();

  await db.execute({
    sql: `INSERT INTO wordle_games (id, word, guesses_json, status) VALUES (?, ?, '[]', 'in_progress')`,
    args: [id, word],
  });

  return NextResponse.json({
    gameId: id,
    wordLength: WORD_LENGTH,
    maxGuesses: MAX_GUESSES,
  });
}
