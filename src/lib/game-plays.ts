import { getDb } from "./db";
import { AuthError } from "./players";

export type GameName = "wordle" | "trivia" | "connections" | "pictionary";
export type PlayStatus = "not_started" | "in_progress" | "completed";

interface GamePlayRow {
  player_key: string;
  game: GameName;
  status: PlayStatus;
  points_earned: number;
  completed_at: number | null;
}

export async function getGamePlay(playerKey: string, game: GameName): Promise<GamePlayRow | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM game_plays WHERE player_key = ? AND game = ?",
    args: [playerKey, game],
  });
  return (result.rows[0] as unknown as GamePlayRow | undefined) ?? null;
}

/**
 * Call before letting a player start a game. Throws if the game is globally
 * locked by the admin, or if this player has already completed it — a
 * completed game can never be replayed, by design (no re-rolling for a
 * better score).
 */
export async function assertCanStartGame(playerKey: string, game: GameName): Promise<GamePlayRow | null> {
  const db = await getDb();
  const lockResult = await db.execute({
    sql: "SELECT locked FROM game_locks WHERE game = ?",
    args: [game],
  });
  const locked = (lockResult.rows[0] as unknown as { locked: number } | undefined)?.locked;
  if (locked === 1) {
    throw new AuthError("This game isn't open yet. Wait for the admin to unlock it.", 423);
  }

  const play = await getGamePlay(playerKey, game);
  if (play?.status === "completed") {
    throw new AuthError("You've already played this game. Each game can only be played once.", 403);
  }
  return play;
}

export async function markGameInProgress(playerKey: string, game: GameName): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO game_plays (player_key, game, status, points_earned)
          VALUES (?, ?, 'in_progress', 0)
          ON CONFLICT(player_key, game) DO UPDATE SET status = 'in_progress'
          WHERE game_plays.status != 'completed'`,
    args: [playerKey, game],
  });
}

/**
 * Finalizes a game for a player: locks it (can't be replayed) and adds the
 * points to their running total. Guarded so a duplicate/concurrent call
 * can't award points twice for the same game.
 */
export async function completeGamePlay(
  playerKey: string,
  game: GameName,
  pointsEarned: number
): Promise<number> {
  const db = await getDb();
  const now = Date.now();

  const updateResult = await db.execute({
    sql: `INSERT INTO game_plays (player_key, game, status, points_earned, completed_at)
          VALUES (?, ?, 'completed', ?, ?)
          ON CONFLICT(player_key, game) DO UPDATE SET
            status = 'completed', points_earned = excluded.points_earned, completed_at = excluded.completed_at
          WHERE game_plays.status != 'completed'`,
    args: [playerKey, game, pointsEarned, now],
  });

  if (updateResult.rowsAffected === 0) {
    // Someone else already completed this game_plays row first (race) —
    // don't award points a second time.
    const existing = await getGamePlay(playerKey, game);
    return existing?.points_earned ?? 0;
  }

  await db.execute({
    sql: `UPDATE players SET total_points = total_points + ?, points_updated_at = ? WHERE name_key = ?`,
    args: [pointsEarned, now, playerKey],
  });

  const totalResult = await db.execute({
    sql: "SELECT total_points FROM players WHERE name_key = ?",
    args: [playerKey],
  });
  return (totalResult.rows[0] as unknown as { total_points: number }).total_points;
}

/**
 * Pictionary spans multiple rounds, so unlike the other games it can't be
 * "completed" after one play — points accrue across every round a player
 * participates in (as drawer or guesser), staying in_progress, until the
 * admin calls finalizePictionaryForPlayer to lock it all in at once.
 */
export async function addPictionaryPoints(playerKey: string, points: number): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO game_plays (player_key, game, status, points_earned)
          VALUES (?, 'pictionary', 'in_progress', ?)
          ON CONFLICT(player_key, game) DO UPDATE SET
            points_earned = points_earned + excluded.points_earned
          WHERE game_plays.status != 'completed'`,
    args: [playerKey, points],
  });
}

export async function finalizePictionaryForPlayer(playerKey: string): Promise<void> {
  const play = await getGamePlay(playerKey, "pictionary");
  if (!play || play.status === "completed") return;
  await completeGamePlay(playerKey, "pictionary", play.points_earned);
}
