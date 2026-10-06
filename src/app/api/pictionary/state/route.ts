import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPlayerFromToken, bearerToken, AuthError } from "@/lib/players";
import { getRound, endRoundIfNeeded } from "@/lib/pictionary-rounds";

export const runtime = "nodejs";

interface RoundPlayerRow {
  last_guess: string | null;
  correct_at: number | null;
  points_earned: number | null;
}

export async function GET(req: NextRequest) {
  try {
    const player = await getPlayerFromToken(bearerToken(req));
    const db = await getDb();

    const sessionResult = await db.execute("SELECT * FROM pictionary_session WHERE id = 1");
    const session = sessionResult.rows[0] as unknown as { status: string; current_round_id: string | null } | undefined;

    if (!session?.current_round_id) {
      const lockResult = await db.execute({
        sql: "SELECT locked FROM game_locks WHERE game = 'pictionary'",
        args: [],
      });
      const locked = (lockResult.rows[0] as unknown as { locked: number } | undefined)?.locked === 1;
      return NextResponse.json({ status: locked ? "locked" : "waiting" });
    }

    let round = await getRound(session.current_round_id);
    if (!round) return NextResponse.json({ status: "waiting" });
    round = await endRoundIfNeeded(round);

    const isDrawer = round.drawer_key === player.nameKey;
    const remainingMs = Math.max(0, round.started_at + round.duration_ms - Date.now());
    const strokes = JSON.parse(round.strokes_json);

    if (round.status === "ended") {
      const myRowResult = isDrawer
        ? null
        : await db.execute({
            sql: "SELECT * FROM pictionary_round_players WHERE round_id = ? AND player_key = ?",
            args: [round.id, player.nameKey],
          });
      const myRow = myRowResult?.rows[0] as unknown as RoundPlayerRow | undefined;

      const countResult = await db.execute({
        sql: "SELECT COUNT(*) AS c FROM pictionary_round_players WHERE round_id = ? AND correct_at IS NOT NULL",
        args: [round.id],
      });
      const correctCount = (countResult.rows[0] as unknown as { c: number }).c;

      return NextResponse.json({
        status: "round_ended",
        roundId: round.id,
        isDrawer,
        word: round.word,
        strokes,
        correctGuessersCount: correctCount,
        pointsEarned: isDrawer ? undefined : (myRow?.points_earned ?? 0),
        correct: isDrawer ? undefined : myRow?.correct_at !== null,
      });
    }

    if (isDrawer) {
      const countResult = await db.execute({
        sql: "SELECT COUNT(*) AS total, SUM(CASE WHEN correct_at IS NOT NULL THEN 1 ELSE 0 END) AS correct FROM pictionary_round_players WHERE round_id = ?",
        args: [round.id],
      });
      const counts = countResult.rows[0] as unknown as { total: number; correct: number };
      return NextResponse.json({
        status: "active",
        roundId: round.id,
        isDrawer: true,
        word: round.word,
        strokes,
        remainingMs,
        durationMs: round.duration_ms,
        totalGuessers: counts.total,
        correctGuessersCount: counts.correct ?? 0,
      });
    }

    const myRowResult = await db.execute({
      sql: "SELECT * FROM pictionary_round_players WHERE round_id = ? AND player_key = ?",
      args: [round.id, player.nameKey],
    });
    const myRow = myRowResult.rows[0] as unknown as RoundPlayerRow | undefined;

    return NextResponse.json({
      status: "active",
      roundId: round.id,
      isDrawer: false,
      wordLength: round.word.length,
      strokes,
      remainingMs,
      durationMs: round.duration_ms,
      hasGuessedCorrectly: myRow?.correct_at !== null && myRow?.correct_at !== undefined,
      lastGuess: myRow?.last_guess ?? "",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
