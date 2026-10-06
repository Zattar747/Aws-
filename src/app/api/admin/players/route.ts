import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { assertAdmin, bearerToken } from "@/lib/admin";
import { AuthError } from "@/lib/players";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await assertAdmin(bearerToken(req));
    const db = await getDb();

    const playersResult = await db.execute(
      `SELECT name_key, display_name, total_points, created_at
       FROM players ORDER BY total_points DESC, points_updated_at ASC`
    );
    const players = playersResult.rows as unknown as {
      name_key: string;
      display_name: string;
      total_points: number;
      created_at: number;
    }[];

    const playsResult = await db.execute(
      "SELECT player_key, game, status, points_earned FROM game_plays"
    );
    const plays = playsResult.rows as unknown as {
      player_key: string;
      game: string;
      status: string;
      points_earned: number;
    }[];
    const playsByPlayer = new Map<string, typeof plays>();
    for (const p of plays) {
      const list = playsByPlayer.get(p.player_key) ?? [];
      list.push(p);
      playsByPlayer.set(p.player_key, list);
    }

    return NextResponse.json({
      players: players.map((p) => ({
        displayName: p.display_name,
        totalPoints: p.total_points,
        createdAt: p.created_at,
        games: Object.fromEntries(
          (playsByPlayer.get(p.name_key) ?? []).map((g) => [
            g.game,
            { status: g.status, pointsEarned: g.points_earned },
          ])
        ),
      })),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
