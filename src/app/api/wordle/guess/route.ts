import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ALLOWED_GUESSES } from "@/lib/words";
import { scoreGuess } from "@/lib/wordle-logic";

export const runtime = "nodejs";

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

interface GameRow {
  id: string;
  word: string;
  guesses_json: string;
  status: "in_progress" | "won" | "lost";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  const rawGuess = typeof body?.guess === "string" ? body.guess.trim().toLowerCase() : "";

  const db = await getDb();
  const gameResult = await db.execute({
    sql: "SELECT * FROM wordle_games WHERE id = ?",
    args: [gameId],
  });
  const game = gameResult.rows[0] as unknown as GameRow | undefined;

  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }
  if (game.status !== "in_progress") {
    return NextResponse.json({ error: "This game has already ended." }, { status: 400 });
  }
  if (rawGuess.length !== WORD_LENGTH || !/^[a-z]+$/.test(rawGuess)) {
    return NextResponse.json({ error: "Guess must be a 5-letter word." }, { status: 400 });
  }
  if (!ALLOWED_GUESSES.has(rawGuess)) {
    return NextResponse.json({ error: "Not in word list." }, { status: 400 });
  }

  const guesses: string[] = JSON.parse(game.guesses_json);
  guesses.push(rawGuess);

  const result = scoreGuess(rawGuess, game.word);
  const won = rawGuess === game.word;
  const outOfGuesses = guesses.length >= MAX_GUESSES;
  const status: GameRow["status"] = won ? "won" : outOfGuesses ? "lost" : "in_progress";

  // Guard against a concurrent duplicate submission for this same game
  // (double-click, retried request) corrupting the guess history.
  const updateResult = await db.execute({
    sql: `UPDATE wordle_games SET guesses_json = ?, status = ? WHERE id = ? AND status = 'in_progress'`,
    args: [JSON.stringify(guesses), status, gameId],
  });
  if (updateResult.rowsAffected === 0) {
    return NextResponse.json({ error: "This game has already ended." }, { status: 400 });
  }

  return NextResponse.json({
    result,
    status,
    guessesUsed: guesses.length,
    maxGuesses: MAX_GUESSES,
    answer: status !== "in_progress" ? game.word : undefined,
  });
}
