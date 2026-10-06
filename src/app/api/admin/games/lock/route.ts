import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { assertAdmin, bearerToken } from "@/lib/admin";
import { AuthError } from "@/lib/players";

export const runtime = "nodejs";

const VALID_GAMES = ["wordle", "trivia", "connections", "pictionary"];

export async function POST(req: NextRequest) {
  try {
    await assertAdmin(bearerToken(req));
    const body = await req.json().catch(() => null);
    const game = body?.game;
    const locked = body?.locked;

    if (!VALID_GAMES.includes(game) || typeof locked !== "boolean") {
      return NextResponse.json({ error: "Invalid game or lock value." }, { status: 400 });
    }

    const db = await getDb();
    await db.execute({
      sql: `INSERT INTO game_locks (game, locked, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(game) DO UPDATE SET locked = excluded.locked, updated_at = excluded.updated_at`,
      args: [game, locked ? 1 : 0, Date.now()],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function GET(req: NextRequest) {
  try {
    await assertAdmin(bearerToken(req));
    const db = await getDb();
    const result = await db.execute("SELECT game, locked FROM game_locks");
    const rows = result.rows as unknown as { game: string; locked: number }[];
    return NextResponse.json({
      locks: Object.fromEntries(rows.map((r) => [r.game, r.locked === 1])),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
