import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { assertAdmin, bearerToken } from "@/lib/admin";
import { AuthError } from "@/lib/players";
import { PICTIONARY_WORDS, PICTIONARY_ROUND_DURATION_MS } from "@/lib/pictionary";
import { shuffle } from "@/lib/shuffle";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await assertAdmin(bearerToken(req));
    const db = await getDb();

    const sessionResult = await db.execute("SELECT * FROM pictionary_session WHERE id = 1");
    const session = sessionResult.rows[0] as unknown as { status: string } | undefined;
    if (session?.status === "round_active") {
      return NextResponse.json({ error: "A round is already active." }, { status: 400 });
    }

    // Prefer players who haven't drawn yet; once everyone has had a turn,
    // allow repeats rather than refusing to run more rounds.
    const allPlayers = await db.execute("SELECT name_key FROM players");
    const allKeys = (allPlayers.rows as unknown as { name_key: string }[]).map((r) => r.name_key);
    if (allKeys.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 registered players to run Pictionary." },
        { status: 400 }
      );
    }

    const usedResult = await db.execute("SELECT player_key FROM pictionary_drawers_used");
    const usedKeys = new Set((usedResult.rows as unknown as { player_key: string }[]).map((r) => r.player_key));
    let candidates = allKeys.filter((k) => !usedKeys.has(k));
    if (candidates.length === 0) candidates = allKeys;

    const drawerKey = shuffle(candidates)[0];

    const usedWordsResult = await db.execute("SELECT word FROM pictionary_rounds");
    const usedWords = new Set((usedWordsResult.rows as unknown as { word: string }[]).map((r) => r.word));
    let wordPool = PICTIONARY_WORDS.filter((w) => !usedWords.has(w));
    if (wordPool.length === 0) wordPool = PICTIONARY_WORDS;
    const word = shuffle(wordPool)[0];

    const roundId = randomUUID();
    const now = Date.now();

    await db.execute({
      sql: `INSERT INTO pictionary_rounds (id, drawer_key, word, strokes_json, status, started_at, duration_ms)
            VALUES (?, ?, ?, '[]', 'active', ?, ?)`,
      args: [roundId, drawerKey, word, now, PICTIONARY_ROUND_DURATION_MS],
    });
    await db.execute({
      sql: "INSERT INTO pictionary_drawers_used (player_key) VALUES (?) ON CONFLICT(player_key) DO NOTHING",
      args: [drawerKey],
    });
    await db.execute({
      sql: `INSERT INTO pictionary_round_players (round_id, player_key)
            SELECT ?, name_key FROM players WHERE name_key != ?`,
      args: [roundId, drawerKey],
    });
    await db.execute({
      sql: `INSERT INTO pictionary_session (id, status, current_round_id, updated_at)
            VALUES (1, 'round_active', ?, ?)
            ON CONFLICT(id) DO UPDATE SET status = 'round_active', current_round_id = excluded.current_round_id, updated_at = excluded.updated_at`,
      args: [roundId, now],
    });

    return NextResponse.json({ roundId, drawerKey, durationMs: PICTIONARY_ROUND_DURATION_MS });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
