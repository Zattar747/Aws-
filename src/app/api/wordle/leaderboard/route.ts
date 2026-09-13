import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

interface LeaderboardRow {
  display_name: string;
  guesses: number;
  time_ms: number;
  finished_at: number;
}

export async function GET() {
  const db = await getDb();
  const result = await db.execute(
    `SELECT
       p.display_name AS display_name,
       json_array_length(g.guesses_json) AS guesses,
       (g.finished_at - g.started_at) AS time_ms,
       g.finished_at AS finished_at
     FROM wordle_games g
     JOIN players p ON p.name_key = g.player_key
     WHERE g.status = 'won'
     ORDER BY guesses ASC, time_ms ASC
     LIMIT 20`
  );
  const rows = result.rows as unknown as LeaderboardRow[];

  return NextResponse.json({
    entries: rows.map((r) => ({
      playerName: r.display_name,
      guesses: r.guesses,
      timeMs: r.time_ms,
      finishedAt: r.finished_at,
    })),
  });
}
