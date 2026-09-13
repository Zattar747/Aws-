import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ICON_LABELS, type MemoryGameRow, type Scores } from "@/lib/memory-logic";
import { awardPoints } from "@/lib/players";
import { memorySinglePoints, memoryTwoPlayerPoints } from "@/lib/points";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  const index = Number.isInteger(body?.index) ? (body.index as number) : -1;

  const db = await getDb();
  const gameResult = await db.execute({
    sql: "SELECT * FROM memory_games WHERE id = ?",
    args: [gameId],
  });
  const game = gameResult.rows[0] as unknown as MemoryGameRow | undefined;

  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }
  if (game.status !== "in_progress") {
    return NextResponse.json({ error: "This game has already ended." }, { status: 400 });
  }

  const deck: string[] = JSON.parse(game.deck_json);
  const matched: boolean[] = JSON.parse(game.matched_json);

  if (index < 0 || index >= deck.length) {
    return NextResponse.json({ error: "Card out of range." }, { status: 400 });
  }
  if (matched[index]) {
    return NextResponse.json({ error: "That card is already matched." }, { status: 400 });
  }
  if (index === game.pending_index) {
    return NextResponse.json({ error: "Pick a different card." }, { status: 400 });
  }

  const label = ICON_LABELS[deck[index]];

  if (game.pending_index === null) {
    await db.execute({
      sql: "UPDATE memory_games SET pending_index = ? WHERE id = ?",
      args: [index, gameId],
    });
    return NextResponse.json({
      phase: "first",
      index,
      label,
      currentPlayer: game.current_player,
    });
  }

  const firstIndex = game.pending_index;
  const isMatch = deck[firstIndex] === deck[index];
  const scores: Scores = JSON.parse(game.scores_json);
  const movesUsed = game.moves_count + 1;
  const playerKey: "1" | "2" = String(game.current_player) as "1" | "2";

  if (isMatch) {
    matched[firstIndex] = true;
    matched[index] = true;
    scores[playerKey] += 1;
  }

  const allMatched = matched.every(Boolean);
  const nextPlayer =
    isMatch || game.mode === "single"
      ? game.current_player
      : game.current_player === 1
        ? 2
        : 1;
  const status = allMatched ? "done" : "in_progress";
  const finishedAt = allMatched ? Date.now() : null;

  // Guard against a concurrent duplicate submission for this same pending
  // flip also reaching "done" and awarding points twice.
  const updateResult = await db.execute({
    sql: `UPDATE memory_games
          SET matched_json = ?, pending_index = NULL, current_player = ?,
              moves_count = ?, scores_json = ?, status = ?, finished_at = ?
          WHERE id = ? AND status = 'in_progress' AND pending_index = ?`,
    args: [
      JSON.stringify(matched),
      nextPlayer,
      movesUsed,
      JSON.stringify(scores),
      status,
      finishedAt,
      gameId,
      firstIndex,
    ],
  });
  if (updateResult.rowsAffected === 0) {
    return NextResponse.json({ error: "This flip is no longer active." }, { status: 400 });
  }

  let pointsAwarded: Record<string, number> | undefined;
  let winner: 1 | 2 | "tie" | undefined;

  if (status === "done") {
    const pairCount = deck.length / 2;
    if (game.mode === "single") {
      const points = memorySinglePoints(movesUsed, pairCount);
      await awardPoints(game.player1_key, "memory-single", points, `moves:${movesUsed}`);
      pointsAwarded = { player1: points };
    } else {
      const p1Pairs = scores["1"];
      const p2Pairs = scores["2"];
      winner = p1Pairs > p2Pairs ? 1 : p2Pairs > p1Pairs ? 2 : "tie";
      const p1Result = memoryTwoPlayerPoints(p1Pairs, p2Pairs);
      const p2Result = memoryTwoPlayerPoints(p2Pairs, p1Pairs);
      const p1Points = winner === "tie" ? p1Result.tie : winner === 1 ? p1Result.winner : p1Result.loser;
      const p2Points = winner === "tie" ? p2Result.tie : winner === 2 ? p2Result.winner : p2Result.loser;
      await awardPoints(game.player1_key, "memory-2p", p1Points, `pairs:${p1Pairs} vs ${p2Pairs}`);
      if (game.player2_key) {
        await awardPoints(game.player2_key, "memory-2p", p2Points, `pairs:${p2Pairs} vs ${p1Pairs}`);
      }
      pointsAwarded = { player1: p1Points, player2: p2Points };
    }
  }

  return NextResponse.json({
    phase: "resolved",
    matched: isMatch,
    indices: [firstIndex, index],
    labels: [ICON_LABELS[deck[firstIndex]], label],
    scores,
    currentPlayer: nextPlayer,
    movesUsed,
    status,
    winner,
    pointsAwarded,
  });
}
