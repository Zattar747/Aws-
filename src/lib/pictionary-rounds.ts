import { getDb } from "./db";
import { addPictionaryPoints } from "./game-plays";
import { isCloseGuess } from "./pictionary";
import { pictionaryDrawerPoints, pictionaryGuesserPoints } from "./points";

export interface RoundRow {
  id: string;
  drawer_key: string;
  word: string;
  strokes_json: string;
  status: "active" | "ended";
  started_at: number;
  ended_at: number | null;
  duration_ms: number;
}

interface RoundPlayerRow {
  round_id: string;
  player_key: string;
  last_guess: string | null;
  correct_at: number | null;
  points_earned: number | null;
}

export async function getRound(roundId: string): Promise<RoundRow | null> {
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM pictionary_rounds WHERE id = ?", args: [roundId] });
  return (result.rows[0] as unknown as RoundRow | undefined) ?? null;
}

/** Call on every access to a round — transitions it to "ended" and scores
 * it exactly once, whether that's because its timer ran out or the admin
 * ended it early. The guarded UPDATE means a flood of concurrent pollers
 * can't double-score it. */
export async function endRoundIfNeeded(round: RoundRow, force = false): Promise<RoundRow> {
  const isDue = round.status === "active" && Date.now() >= round.started_at + round.duration_ms;
  if (round.status !== "active" || !(isDue || force)) return round;

  const db = await getDb();
  const updateResult = await db.execute({
    sql: "UPDATE pictionary_rounds SET status = 'ended', ended_at = ? WHERE id = ? AND status = 'active'",
    args: [Date.now(), round.id],
  });

  if (updateResult.rowsAffected > 0) {
    await scoreRound(round);
  }

  return (await getRound(round.id)) ?? round;
}

async function scoreRound(round: RoundRow): Promise<void> {
  const db = await getDb();
  const playersResult = await db.execute({
    sql: "SELECT * FROM pictionary_round_players WHERE round_id = ?",
    args: [round.id],
  });
  const rows = playersResult.rows as unknown as RoundPlayerRow[];

  const correctCount = rows.filter((r) => r.correct_at !== null).length;

  for (const row of rows) {
    const correct = row.correct_at !== null;
    const close = !correct && isCloseGuess(row.last_guess, round.word);
    const points = pictionaryGuesserPoints(correct, close);
    await db.execute({
      sql: "UPDATE pictionary_round_players SET points_earned = ? WHERE round_id = ? AND player_key = ?",
      args: [points, round.id, row.player_key],
    });
    await addPictionaryPoints(row.player_key, points);
  }

  const drawerPoints = pictionaryDrawerPoints(correctCount, rows.length);
  await addPictionaryPoints(round.drawer_key, drawerPoints);

  await db.execute({
    sql: "UPDATE pictionary_session SET status = 'round_ended', updated_at = ? WHERE id = 1",
    args: [Date.now()],
  });
}
