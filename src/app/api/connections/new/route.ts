import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPlayerFromToken, bearerToken, AuthError } from "@/lib/players";
import { assertCanStartGame } from "@/lib/game-plays";
import { buildGrid, GRID_ROWS, GRID_COLS, MAX_MISTAKES } from "@/lib/connections-logic";
import { parseGrid, type ConnectionsSessionRow } from "@/lib/connections-session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const player = await getPlayerFromToken(bearerToken(req));

    const { extraResults } = await assertCanStartGame(player.nameKey, "connections", [
      {
        sql: "SELECT * FROM connections_sessions WHERE player_key = ? AND status = 'in_progress'",
        args: [player.nameKey],
      },
    ]);
    const existingRow = extraResults[0].rows[0] as unknown as ConnectionsSessionRow | undefined;

    if (existingRow) {
      const grid = parseGrid(existingRow.grid_json);
      const solved: string[] = JSON.parse(existingRow.solved_json);
      const solvedPositions = grid.reduce<number[]>((acc, cell, i) => {
        if (solved.includes(cell.category)) acc.push(i);
        return acc;
      }, []);
      return NextResponse.json({
        sessionId: existingRow.id,
        rows: GRID_ROWS,
        cols: GRID_COLS,
        words: grid.map((c) => c.word),
        solvedCategories: solved,
        solvedPositions,
        score: existingRow.score,
        totalCategories: 8,
        mistakesRemaining: Math.max(0, MAX_MISTAKES - existingRow.mistakes),
      });
    }

    const id = randomUUID();
    const grid = buildGrid();
    const now = Date.now();

    const db = await getDb();
    await db.batch([
      {
        sql: `INSERT INTO connections_sessions (id, player_key, grid_json, solved_json, score, started_at, status)
              VALUES (?, ?, ?, '[]', 0, ?, 'in_progress')`,
        args: [id, player.nameKey, JSON.stringify(grid), now],
      },
      {
        sql: `INSERT INTO game_plays (player_key, game, status, points_earned)
              VALUES (?, 'connections', 'in_progress', 0)
              ON CONFLICT(player_key, game) DO UPDATE SET status = 'in_progress'
              WHERE game_plays.status != 'completed'`,
        args: [player.nameKey],
      },
    ]);

    return NextResponse.json({
      sessionId: id,
      rows: GRID_ROWS,
      cols: GRID_COLS,
      words: grid.map((c) => c.word),
      solvedCategories: [],
      solvedPositions: [],
      score: 0,
      totalCategories: 8,
      mistakesRemaining: MAX_MISTAKES,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
