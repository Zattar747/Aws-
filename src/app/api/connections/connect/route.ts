import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPlayerFromToken, bearerToken, AuthError } from "@/lib/players";
import { GROUP_SIZE, isValidPosition, maxCategoryOverlap, TOTAL_CATEGORIES } from "@/lib/connections-logic";
import { CONNECTIONS_POINTS_PER_CATEGORY } from "@/lib/points";
import { finalizeSession, loadSession, parseGrid } from "@/lib/connections-session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const player = await getPlayerFromToken(bearerToken(req));
    const body = await req.json().catch(() => null);
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
    const positions: unknown = body?.positions;

    const session = await loadSession(sessionId, player.nameKey);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    if (session.status !== "in_progress") {
      return NextResponse.json({ error: "This game is already finished." }, { status: 400 });
    }

    if (
      !Array.isArray(positions) ||
      positions.length !== GROUP_SIZE ||
      !positions.every(isValidPosition) ||
      new Set(positions).size !== GROUP_SIZE
    ) {
      return NextResponse.json({ error: "Pick exactly 4 different words." }, { status: 400 });
    }

    const grid = parseGrid(session.grid_json);
    const solved: string[] = JSON.parse(session.solved_json);
    const categories = positions.map((p) => grid[p].category);

    if (categories.some((c) => solved.includes(c))) {
      return NextResponse.json({ error: "One of those words is already part of a solved group." }, { status: 400 });
    }

    const { category, count } = maxCategoryOverlap(categories);

    if (count !== GROUP_SIZE) {
      return NextResponse.json({
        correct: false,
        awayCount: count >= 2 ? GROUP_SIZE - count : undefined,
        totalScore: session.score,
        solvedCount: solved.length,
        totalCategories: TOTAL_CATEGORIES,
      });
    }

    const newSolved = [...solved, category];
    const newScore = session.score + CONNECTIONS_POINTS_PER_CATEGORY;
    const allSolved = newSolved.length === TOTAL_CATEGORIES;

    const db = await getDb();
    const updateResult = await db.execute({
      sql: `UPDATE connections_sessions SET solved_json = ?, score = ?
            WHERE id = ? AND status = 'in_progress' AND solved_json = ?`,
      args: [JSON.stringify(newSolved), newScore, session.id, session.solved_json],
    });
    if (updateResult.rowsAffected === 0) {
      return NextResponse.json({ error: "Try again." }, { status: 409 });
    }

    let totalPoints: number | undefined;
    if (allSolved) {
      totalPoints = await finalizeSession(player.nameKey, { ...session, score: newScore });
    }

    return NextResponse.json({
      correct: true,
      category,
      positions,
      pointsEarned: CONNECTIONS_POINTS_PER_CATEGORY,
      totalScore: newScore,
      solvedCount: newSolved.length,
      totalCategories: TOTAL_CATEGORIES,
      allSolved,
      totalPoints,
      grid: allSolved ? grid : undefined,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
