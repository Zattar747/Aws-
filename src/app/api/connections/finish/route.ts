import { NextRequest, NextResponse } from "next/server";
import { getPlayerFromToken, bearerToken, AuthError } from "@/lib/players";
import { TOTAL_CATEGORIES } from "@/lib/connections-logic";
import { finalizeSession, loadSession, parseGrid } from "@/lib/connections-session";

export const runtime = "nodejs";

// Called when the client's local countdown hits zero (or the player gives
// up early). Finishing early never helps a tampered client: it only locks
// in whatever score has already been server-validated up to that point, so
// there's nothing to gain by calling this ahead of schedule.
export async function POST(req: NextRequest) {
  try {
    const player = await getPlayerFromToken(bearerToken(req));
    const body = await req.json().catch(() => null);
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";

    const session = await loadSession(sessionId, player.nameKey);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    if (session.status !== "in_progress") {
      return NextResponse.json({
        totalScore: session.score,
        totalCategories: TOTAL_CATEGORIES,
        grid: parseGrid(session.grid_json),
      });
    }

    const totalPoints = await finalizeSession(player.nameKey, session);
    return NextResponse.json({
      totalScore: session.score,
      totalCategories: TOTAL_CATEGORIES,
      totalPoints,
      grid: parseGrid(session.grid_json),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
