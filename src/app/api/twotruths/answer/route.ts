import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { TWO_TRUTHS_ITEMS } from "@/lib/two-truths-data";
import { awardPoints } from "@/lib/players";
import { twoTruthsPoints } from "@/lib/points";

export const runtime = "nodejs";

interface RoundRow {
  id: string;
  player_key: string;
  item_index: number;
  status: "in_progress" | "done";
  started_at: number;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const roundId = typeof body?.roundId === "string" ? body.roundId : "";
  const chosenIndex = body?.chosenIndex;

  const db = await getDb();
  const roundResult = await db.execute({
    sql: "SELECT * FROM two_truths_rounds WHERE id = ?",
    args: [roundId],
  });
  const round = roundResult.rows[0] as unknown as RoundRow | undefined;

  if (!round) {
    return NextResponse.json({ error: "Round not found." }, { status: 404 });
  }
  if (round.status !== "in_progress") {
    return NextResponse.json({ error: "This round has already ended." }, { status: 400 });
  }
  if (![0, 1, 2].includes(chosenIndex)) {
    return NextResponse.json({ error: "Pick statement 1, 2, or 3." }, { status: 400 });
  }

  const item = TWO_TRUTHS_ITEMS[round.item_index];
  const correct = chosenIndex === item.lieIndex;
  const finishedAt = Date.now();

  // Guard against a concurrent duplicate submission for this round also
  // reaching "done" and awarding points twice.
  const updateResult = await db.execute({
    sql: `UPDATE two_truths_rounds
          SET chosen_index = ?, correct = ?, status = 'done', finished_at = ?
          WHERE id = ? AND status = 'in_progress'`,
    args: [chosenIndex, correct ? 1 : 0, finishedAt, roundId],
  });
  if (updateResult.rowsAffected === 0) {
    return NextResponse.json({ error: "This round has already ended." }, { status: 400 });
  }

  const pointsAwarded = twoTruthsPoints(correct);
  const totalPoints = await awardPoints(
    round.player_key,
    "two-truths",
    pointsAwarded,
    correct ? "correct" : "wrong"
  );

  return NextResponse.json({
    correct,
    lieIndex: item.lieIndex,
    pointsAwarded,
    totalPoints,
  });
}
