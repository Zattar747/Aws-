import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getNextWord } from "@/lib/words";
import { getPlayerFromToken, bearerToken, AuthError } from "@/lib/players";
import { assertCanStartGame } from "@/lib/game-plays";
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

    // Folds the "do I already have an in-progress attempt?" read into the
    // same round trip as the lock/already-played checks, instead of a
    // separate one — every round trip here is a real network hop to Turso.
    const { extraResults } = await assertCanStartGame(player.nameKey, "wordle", [
      {
        sql: "SELECT id, word, guesses_json, status FROM wordle_games WHERE player_key = ? AND status = 'in_progress'",
        args: [player.nameKey],
      },
    ]);
    const existingRow = extraResults[0].rows[0] as unknown as ExistingGameRow | undefined;

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

    const db = await getDb();
    await db.batch([
      {
        sql: `INSERT INTO wordle_games (id, player_key, word, guesses_json, status) VALUES (?, ?, ?, '[]', 'in_progress')`,
        args: [id, player.nameKey, word],
      },
      {
        sql: `INSERT INTO game_plays (player_key, game, status, points_earned)
              VALUES (?, 'wordle', 'in_progress', 0)
              ON CONFLICT(player_key, game) DO UPDATE SET status = 'in_progress'
              WHERE game_plays.status != 'completed'`,
        args: [player.nameKey],
      },
    ]);

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
