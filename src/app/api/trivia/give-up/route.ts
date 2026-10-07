import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPlayerFromToken, bearerToken, AuthError } from "@/lib/players";
import { completeGamePlay } from "@/lib/game-plays";

export const runtime = "nodejs";

interface SessionRow {
  id: string;
  player_key: string;
  status: string;
}

export async function POST(req: NextRequest) {
  try {
    const player = await getPlayerFromToken(bearerToken(req));
    const body = await req.json().catch(() => null);
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";

    const db = await getDb();
    const result = await db.execute({ sql: "SELECT * FROM trivia_sessions WHERE id = ?", args: [sessionId] });
    const session = result.rows[0] as unknown as SessionRow | undefined;

    if (!session || session.player_key !== player.nameKey) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    if (session.status !== "in_progress") {
      return NextResponse.json({ error: "This quiz has already ended." }, { status: 400 });
    }

    const updateResult = await db.execute({
      sql: `UPDATE trivia_sessions SET status = 'done' WHERE id = ? AND status = 'in_progress'`,
      args: [sessionId],
    });
    if (updateResult.rowsAffected === 0) {
      return NextResponse.json({ error: "This quiz has already ended." }, { status: 400 });
    }

    const totalPoints = await completeGamePlay(player.nameKey, "trivia", 0);

    return NextResponse.json({ done: true, pointsEarned: 0, totalScore: 0, totalPoints });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
