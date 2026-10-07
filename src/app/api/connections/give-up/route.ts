import { NextRequest, NextResponse } from "next/server";
import { getPlayerFromToken, bearerToken, AuthError } from "@/lib/players";
import { TOTAL_CATEGORIES } from "@/lib/connections-logic";
import { giveUpSession, loadSession, parseGrid } from "@/lib/connections-session";

export const runtime = "nodejs";

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
      return NextResponse.json({ error: "This game is already finished." }, { status: 400 });
    }

    const totalPoints = await giveUpSession(player.nameKey, session);
    return NextResponse.json({
      totalScore: 0,
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
