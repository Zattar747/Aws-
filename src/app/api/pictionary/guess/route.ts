import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPlayerFromToken, bearerToken, AuthError } from "@/lib/players";
import { getRound } from "@/lib/pictionary-rounds";
import { isExactGuess } from "@/lib/pictionary";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const player = await getPlayerFromToken(bearerToken(req));
    const body = await req.json().catch(() => null);
    const roundId = typeof body?.roundId === "string" ? body.roundId : "";
    const guess = typeof body?.guess === "string" ? body.guess.trim().slice(0, 40) : "";

    const round = await getRound(roundId);
    if (!round) return NextResponse.json({ error: "Round not found." }, { status: 404 });
    if (round.drawer_key === player.nameKey) {
      return NextResponse.json({ error: "The drawer can't guess." }, { status: 403 });
    }
    if (round.status !== "active") {
      return NextResponse.json({ error: "This round has ended." }, { status: 400 });
    }
    if (!guess) {
      return NextResponse.json({ error: "Enter a guess." }, { status: 400 });
    }

    const correct = isExactGuess(guess, round.word);
    const db = await getDb();

    // Only the first correct guess sets correct_at — later guesses (right
    // or wrong) can still update last_guess but shouldn't re-trigger credit.
    await db.execute({
      sql: `UPDATE pictionary_round_players
            SET last_guess = ?, correct_at = CASE WHEN correct_at IS NULL AND ? = 1 THEN ? ELSE correct_at END
            WHERE round_id = ? AND player_key = ?`,
      args: [guess, correct ? 1 : 0, Date.now(), roundId, player.nameKey],
    });

    return NextResponse.json({ correct });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
