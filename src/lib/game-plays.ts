import type { InStatement, ResultSet } from "@libsql/client";
import { getDb } from "./db";
import { AuthError } from "./players";

export type GameName = "wordle" | "trivia" | "connections" | "pictionary";
export type PlayStatus = "not_started" | "in_progress" | "completed" | "blocked";

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
 *
 * `extraStatements` lets a caller fold its own read (e.g. "do I already have
 * an in-progress wordle_games row?") into this same network round trip
 * instead of paying for a separate one — every round trip here crosses a
 * real continent (Vercel's compute region vs. Turso's), so collapsing
 * several sequential reads into one batch is a meaningful latency win, not
 * just tidiness.
 */
export async function assertCanStartGame(
  playerKey: string,
  game: GameName,
  extraStatements: InStatement[] = []
): Promise<{ play: GamePlayRow | null; extraResults: ResultSet[] }> {
  const db = await getDb();
  const results = await db.batch([
    { sql: "SELECT locked FROM game_locks WHERE game = ?", args: [game] },
    { sql: "SELECT * FROM game_plays WHERE player_key = ? AND game = ?", args: [playerKey, game] },
    ...extraStatements,
  ]);

  const locked = (results[0].rows[0] as unknown as { locked: number } | undefined)?.locked === 1;
  if (locked) {
    throw new AuthError("This game isn't open yet. Wait for the admin to unlock it.", 423);
  }

  const play = (results[1].rows[0] as unknown as GamePlayRow | undefined) ?? null;
  if (play?.status === "completed") {
    throw new AuthError("You've already played this game. Each game can only be played once.", 403);
  }
  if (play?.status === "blocked") {
    throw new AuthError("An admin has locked this game for you specifically.", 423);
  }

  return { play, extraResults: results.slice(2) };
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

  const results = await db.batch([
    {
      sql: "UPDATE players SET total_points = total_points + ?, points_updated_at = ? WHERE name_key = ?",
      args: [pointsEarned, now, playerKey],
    },
    { sql: "SELECT total_points FROM players WHERE name_key = ?", args: [playerKey] },
  ]);
  return (results[1].rows[0] as unknown as { total_points: number }).total_points;
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

/**
 * Admin override for one specific player's access to one game, separate
 * from the global per-game lock. Locking sets status to 'blocked', which
 * assertCanStartGame rejects just like a global lock. Unlocking clears
 * that block — and if the player had already completed the game, also
 * reverses the points it awarded them so they get a clean replay instead
 * of keeping points from a run that's being wiped.
 */
export async function adminSetPlayerGameLock(
  playerKey: string,
  game: GameName,
  locked: boolean
): Promise<void> {
  const db = await getDb();

  if (locked) {
    await db.execute({
      sql: `INSERT INTO game_plays (player_key, game, status, points_earned)
            VALUES (?, ?, 'blocked', 0)
            ON CONFLICT(player_key, game) DO UPDATE SET status = 'blocked'`,
      args: [playerKey, game],
    });
    return;
  }

  const play = await getGamePlay(playerKey, game);
  if (play?.status === "completed" && play.points_earned > 0) {
    await db.batch([
      {
        sql: "UPDATE players SET total_points = total_points - ?, points_updated_at = ? WHERE name_key = ?",
        args: [play.points_earned, Date.now(), playerKey],
      },
      {
        sql: `UPDATE game_plays SET status = 'not_started', points_earned = 0, completed_at = NULL
              WHERE player_key = ? AND game = ?`,
        args: [playerKey, game],
      },
    ]);
    return;
  }

  await db.execute({
    sql: `INSERT INTO game_plays (player_key, game, status, points_earned)
          VALUES (?, ?, 'not_started', 0)
          ON CONFLICT(player_key, game) DO UPDATE SET status = 'not_started'
          WHERE game_plays.status = 'blocked'`,
    args: [playerKey, game],
  });
}
