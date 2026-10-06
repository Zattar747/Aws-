import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

interface Row {
  display_name: string;
  total_points: number;
  points_updated_at: number;
}

export async function GET() {
  const db = await getDb();
  // Ties broken by whoever reached that point total earliest (ascending
  // points_updated_at), never alphabetically — "first come first served"
  // per the club's rule, not a name-sort coincidence.
  const result = await db.execute(
    `SELECT display_name, total_points, points_updated_at
     FROM players
     ORDER BY total_points DESC, points_updated_at ASC
     LIMIT 200`
  );
  const rows = result.rows as unknown as Row[];

  return NextResponse.json({
    entries: rows.map((r) => ({
      displayName: r.display_name,
      totalPoints: r.total_points,
    })),
  });
}
