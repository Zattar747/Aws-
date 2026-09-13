import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getOrCreatePlayer, normalizeName } from "@/lib/players";
import { buildDeck } from "@/lib/memory-logic";

export const runtime = "nodejs";

const PAIR_COUNT = 8;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const mode = body?.mode === "2p" ? "2p" : body?.mode === "single" ? "single" : null;
  const player1Name = typeof body?.player1Name === "string" ? body.player1Name.trim() : "";
  const player2Name = typeof body?.player2Name === "string" ? body.player2Name.trim() : "";

  if (!mode) {
    return NextResponse.json({ error: "Mode must be 'single' or '2p'." }, { status: 400 });
  }
  if (!player1Name || player1Name.length > 30) {
    return NextResponse.json({ error: "Enter a name (1-30 characters)." }, { status: 400 });
  }
  if (mode === "2p") {
    if (!player2Name || player2Name.length > 30) {
      return NextResponse.json({ error: "Enter a name for player 2." }, { status: 400 });
    }
    if (normalizeName(player1Name) === normalizeName(player2Name)) {
      return NextResponse.json(
        { error: "Player 1 and player 2 need different names." },
        { status: 400 }
      );
    }
  }

  const db = await getDb();
  const player1 = await getOrCreatePlayer(player1Name);
  const player2 = mode === "2p" ? await getOrCreatePlayer(player2Name) : null;

  const deck = buildDeck(PAIR_COUNT);
  const id = randomUUID();
  const startedAt = Date.now();

  await db.execute({
    sql: `INSERT INTO memory_games
            (id, mode, player1_key, player2_key, deck_json, matched_json, pending_index,
             current_player, moves_count, scores_json, status, started_at)
          VALUES (?, ?, ?, ?, ?, ?, NULL, 1, 0, '{"1":0,"2":0}', 'in_progress', ?)`,
    args: [
      id,
      mode,
      player1.nameKey,
      player2?.nameKey ?? null,
      JSON.stringify(deck),
      JSON.stringify(new Array(deck.length).fill(false)),
      startedAt,
    ],
  });

  return NextResponse.json({
    gameId: id,
    mode,
    cardCount: deck.length,
    currentPlayer: 1,
    player1,
    player2,
  });
}
