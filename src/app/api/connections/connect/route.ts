import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPlayerFromToken, bearerToken, AuthError } from "@/lib/players";
import { areAdjacent, isValidPosition, TOTAL_CATEGORIES } from "@/lib/connections-logic";
import { CONNECTIONS_POINTS_PER_CATEGORY } from "@/lib/points";
import { finalizeSession, isExpired, loadSession, parseGrid } from "@/lib/connections-session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const player = await getPlayerFromToken(bearerToken(req));
    const body = await req.json().catch(() => null);
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
    const posA = body?.posA;
    const posB = body?.posB;

    const session = await loadSession(sessionId, player.nameKey);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    if (session.status !== "in_progress") {
      return NextResponse.json({ error: "This game is already finished." }, { status: 400 });
    }
    if (isExpired(session)) {
      const totalPoints = await finalizeSession(player.nameKey, session);
      return NextResponse.json({
        correct: false,
        expired: true,
        totalScore: session.score,
        solvedCount: JSON.parse(session.solved_json).length,
        totalCategories: TOTAL_CATEGORIES,
        totalPoints,
      });
    }
    if (!isValidPosition(posA) || !isValidPosition(posB) || !areAdjacent(posA, posB)) {
      return NextResponse.json({ error: "Those two words aren't next to each other." }, { status: 400 });
    }

    const grid = parseGrid(session.grid_json);
    const solved: string[] = JSON.parse(session.solved_json);
    const catA = grid[posA].category;
    const catB = grid[posB].category;

    if (solved.includes(catA) || solved.includes(catB)) {
      return NextResponse.json({
        correct: false,
        alreadySolved: true,
        totalScore: session.score,
        solvedCount: solved.length,
        totalCategories: TOTAL_CATEGORIES,
      });
    }

    if (catA !== catB) {
      return NextResponse.json({
        correct: false,
        totalScore: session.score,
        solvedCount: solved.length,
        totalCategories: TOTAL_CATEGORIES,
      });
    }

    const newSolved = [...solved, catA];
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

    const positions = grid.reduce<number[]>((acc, cell, i) => {
      if (cell.category === catA) acc.push(i);
      return acc;
    }, []);

    return NextResponse.json({
      correct: true,
      category: catA,
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
