import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPlayerFromToken, bearerToken, AuthError } from "@/lib/players";
import { completeGamePlay } from "@/lib/game-plays";

export const runtime = "nodejs";

interface GameRow {
  id: string;
  player_key: string;
  word: string;
  guesses_json: string;
  status: "in_progress" | "won" | "lost";
}

export async function POST(req: NextRequest) {
  try {
    const player = await getPlayerFromToken(bearerToken(req));
    const body = await req.json().catch(() => null);
    const gameId = typeof body?.gameId === "string" ? body.gameId : "";

    const db = await getDb();
    const gameResult = await db.execute({ sql: "SELECT * FROM wordle_games WHERE id = ?", args: [gameId] });
    const game = gameResult.rows[0] as unknown as GameRow | undefined;

    if (!game || game.player_key !== player.nameKey) {
      return NextResponse.json({ error: "Game not found." }, { status: 404 });
    }
    if (game.status !== "in_progress") {
      return NextResponse.json({ error: "This game has already ended." }, { status: 400 });
    }

    const updateResult = await db.execute({
      sql: `UPDATE wordle_games SET status = 'lost' WHERE id = ? AND status = 'in_progress'`,
      args: [gameId],
    });
    if (updateResult.rowsAffected === 0) {
      return NextResponse.json({ error: "This game has already ended." }, { status: 400 });
    }

    const totalPoints = await completeGamePlay(player.nameKey, "wordle", 0);

    return NextResponse.json({
      status: "lost",
      answer: game.word,
      pointsAwarded: 0,
      totalPoints,
      guessesUsed: JSON.parse(game.guesses_json).length,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
