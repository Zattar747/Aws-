import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ALLOWED_GUESSES } from "@/lib/words";
import { scoreGuess } from "@/lib/wordle-logic";
import { awardPoints } from "@/lib/players";
import { wordlePoints } from "@/lib/points";

export const runtime = "nodejs";

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

interface GameRow {
  id: string;
  player_key: string;
  word: string;
  guesses_json: string;
  status: "in_progress" | "won" | "lost";
  started_at: number;
  finished_at: number | null;
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
  const finishedAt = status !== "in_progress" ? Date.now() : null;

  // Guard against a concurrent duplicate submission for this same game
  // (double-click, retried request) also reaching "finished" and awarding
  // points twice: only apply this write if the game was still in_progress
  // the instant before, same as when we read it above.
  const updateResult = await db.execute({
    sql: `UPDATE wordle_games SET guesses_json = ?, status = ?, finished_at = ?
          WHERE id = ? AND status = 'in_progress'`,
    args: [JSON.stringify(guesses), status, finishedAt, gameId],
  });
  if (updateResult.rowsAffected === 0) {
    return NextResponse.json({ error: "This game has already ended." }, { status: 400 });
  }

  let pointsAwarded: number | undefined;
  let totalPoints: number | undefined;
  if (status !== "in_progress") {
    pointsAwarded = wordlePoints(won, guesses.length);
    totalPoints = await awardPoints(
      game.player_key,
      "wordle",
      pointsAwarded,
      `${status} in ${guesses.length}`
    );
  }

  return NextResponse.json({
    result,
    status,
    guessesUsed: guesses.length,
    maxGuesses: MAX_GUESSES,
    answer: status !== "in_progress" ? game.word : undefined,
    timeMs: finishedAt ? finishedAt - game.started_at : undefined,
    pointsAwarded,
    totalPoints,
  });
}
