import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPlayerFromToken, bearerToken, AuthError } from "@/lib/players";
import type { GameName } from "@/lib/game-plays";

export const runtime = "nodejs";

const GAMES: GameName[] = ["wordle", "trivia", "connections", "pictionary"];

export async function GET(req: NextRequest) {
  try {
    const player = await getPlayerFromToken(bearerToken(req));
    const db = await getDb();

    const playsResult = await db.execute({
      sql: "SELECT game, status, points_earned FROM game_plays WHERE player_key = ?",
      args: [player.nameKey],
    });
    const plays = playsResult.rows as unknown as {
      game: GameName;
      status: string;
      points_earned: number;
    }[];
    const playMap = Object.fromEntries(plays.map((p) => [p.game, p]));

    const locksResult = await db.execute("SELECT game, locked FROM game_locks");
    const locks = locksResult.rows as unknown as { game: GameName; locked: number }[];
    const lockMap = Object.fromEntries(locks.map((l) => [l.game, l.locked === 1]));

    const games = Object.fromEntries(
      GAMES.map((g) => [
        g,
        {
          status: playMap[g]?.status ?? "not_started",
          pointsEarned: playMap[g]?.points_earned ?? 0,
          locked: lockMap[g] ?? false,
        },
      ])
    );

    return NextResponse.json({ player, games });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
