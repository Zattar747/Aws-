import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { assertAdmin, bearerToken } from "@/lib/admin";
import { AuthError } from "@/lib/players";
import { finalizePictionaryForPlayer } from "@/lib/game-plays";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await assertAdmin(bearerToken(req));
    const db = await getDb();

    const result = await db.execute(
      "SELECT DISTINCT player_key FROM game_plays WHERE game = 'pictionary' AND status = 'in_progress'"
    );
    const keys = (result.rows as unknown as { player_key: string }[]).map((r) => r.player_key);
    for (const key of keys) {
      await finalizePictionaryForPlayer(key);
    }

    // Lock the game back up so no more rounds/guesses happen after finalize.
    await db.execute({
      sql: `INSERT INTO game_locks (game, locked, updated_at) VALUES ('pictionary', 1, ?)
            ON CONFLICT(game) DO UPDATE SET locked = 1, updated_at = excluded.updated_at`,
      args: [Date.now()],
    });
    await db.execute({
      sql: "UPDATE pictionary_session SET status = 'idle', current_round_id = NULL, updated_at = ? WHERE id = 1",
      args: [Date.now()],
    });

    return NextResponse.json({ ok: true, finalizedCount: keys.length });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
