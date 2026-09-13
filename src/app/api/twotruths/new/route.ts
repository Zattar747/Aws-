import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/players";
import { TWO_TRUTHS_ITEMS } from "@/lib/two-truths-data";
import { getNextIndex } from "@/lib/rotation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const playerName = typeof body?.playerName === "string" ? body.playerName.trim() : "";

  if (!playerName || playerName.length > 30) {
    return NextResponse.json(
      { error: "Enter a name (1-30 characters) to start playing." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const player = await getOrCreatePlayer(playerName);
  const itemIndex = await getNextIndex("two-truths-items", TWO_TRUTHS_ITEMS.length);
  const item = TWO_TRUTHS_ITEMS[itemIndex];
  const id = randomUUID();

  await db.execute({
    sql: `INSERT INTO two_truths_rounds (id, player_key, item_index, status, started_at)
          VALUES (?, ?, ?, 'in_progress', ?)`,
    args: [id, player.nameKey, itemIndex, Date.now()],
  });

  return NextResponse.json({
    roundId: id,
    statements: item.statements,
    player,
  });
}
