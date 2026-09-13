import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

interface Row {
  display_name: string;
  correct_count: number;
  played_count: number;
}

export async function GET() {
  const db = await getDb();
  const result = await db.execute(
    `SELECT
       p.display_name AS display_name,
       SUM(CASE WHEN r.correct = 1 THEN 1 ELSE 0 END) AS correct_count,
       COUNT(*) AS played_count
     FROM two_truths_rounds r
     JOIN players p ON p.name_key = r.player_key
     WHERE r.status = 'done'
     GROUP BY r.player_key
     ORDER BY correct_count DESC, played_count ASC
     LIMIT 20`
  );
  const rows = result.rows as unknown as Row[];

  return NextResponse.json({
    entries: rows.map((r) => ({
      playerName: r.display_name,
      correct: r.correct_count,
      played: r.played_count,
    })),
  });
}
