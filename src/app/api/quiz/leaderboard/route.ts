import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

interface Row {
  display_name: string;
  best_score: number;
}

export async function GET() {
  const db = await getDb();
  const result = await db.execute(
    `SELECT p.display_name AS display_name, MAX(s.score) AS best_score
     FROM quiz_sessions s
     JOIN players p ON p.name_key = s.player_key
     WHERE s.status = 'done'
     GROUP BY s.player_key
     ORDER BY best_score DESC
     LIMIT 20`
  );
  const rows = result.rows as unknown as Row[];

  return NextResponse.json({
    entries: rows.map((r) => ({ playerName: r.display_name, bestScore: r.best_score })),
  });
}
