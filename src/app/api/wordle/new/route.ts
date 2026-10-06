import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getNextWord } from "@/lib/words";
import { getPlayerFromToken, bearerToken, AuthError } from "@/lib/players";
import { assertCanStartGame, markGameInProgress } from "@/lib/game-plays";
import { scoreGuess } from "@/lib/wordle-logic";

export const runtime = "nodejs";

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

interface ExistingGameRow {
  id: string;
  word: string;
  guesses_json: string;
  status: string;
}

export async function POST(req: NextRequest) {
  try {
    const player = await getPlayerFromToken(bearerToken(req));
    await assertCanStartGame(player.nameKey, "wordle");

    const db = await getDb();

    // Resume an existing in-progress attempt (e.g. page refresh) instead of
    // handing out a second word — one play per player, no re-rolls.
    const existing = await db.execute({
      sql: "SELECT id, word, guesses_json, status FROM wordle_games WHERE player_key = ? AND status = 'in_progress'",
      args: [player.nameKey],
    });
    const existingRow = existing.rows[0] as unknown as ExistingGameRow | undefined;
    if (existingRow) {
      const guesses: string[] = JSON.parse(existingRow.guesses_json);
      return NextResponse.json({
        gameId: existingRow.id,
        wordLength: WORD_LENGTH,
        maxGuesses: MAX_GUESSES,
        guesses,
        results: guesses.map((g) => scoreGuess(g, existingRow.word)),
      });
    }

    const id = randomUUID();
    const word = await getNextWord();

    await db.execute({
      sql: `INSERT INTO wordle_games (id, player_key, word, guesses_json, status) VALUES (?, ?, ?, '[]', 'in_progress')`,
      args: [id, player.nameKey, word],
    });
    await markGameInProgress(player.nameKey, "wordle");

    return NextResponse.json({
      gameId: id,
      wordLength: WORD_LENGTH,
      maxGuesses: MAX_GUESSES,
      guesses: [],
      results: [],
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
