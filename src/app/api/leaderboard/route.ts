import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

interface PlayerRow {
  display_name: string;
  total_points: number;
  games_played: number;
}

export async function GET() {
  const db = await getDb();
  const result = await db.execute(
    `SELECT display_name, total_points, games_played
     FROM players
     ORDER BY total_points DESC, games_played ASC
     LIMIT 50`
  );
  const rows = result.rows as unknown as PlayerRow[];

  return NextResponse.json({
    entries: rows.map((r) => ({
      displayName: r.display_name,
      totalPoints: r.total_points,
      gamesPlayed: r.games_played,
    })),
  });
}
