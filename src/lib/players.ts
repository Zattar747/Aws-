import { randomUUID } from "crypto";
import { getDb } from "./db";

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface PlayerRecord {
  nameKey: string;
  displayName: string;
  totalPoints: number;
  gamesPlayed: number;
}

interface PlayerRow {
  name_key: string;
  display_name: string;
  total_points: number;
  games_played: number;
}

/**
 * Identity is just a normalized name — no password. Typing the same name
 * again resumes the same points/history, and casing shown on the
 * leaderboard follows whatever the player typed most recently.
 */
export async function getOrCreatePlayer(rawName: string): Promise<PlayerRecord> {
  const db = await getDb();
  const nameKey = normalizeName(rawName);
  const displayName = rawName.trim();
  const now = Date.now();

  await db.execute({
    sql: `INSERT INTO players (name_key, display_name, total_points, games_played, created_at, updated_at)
          VALUES (?, ?, 0, 0, ?, ?)
          ON CONFLICT(name_key) DO UPDATE SET display_name = excluded.display_name`,
    args: [nameKey, displayName, now, now],
  });

  const result = await db.execute({
    sql: "SELECT * FROM players WHERE name_key = ?",
    args: [nameKey],
  });
  const row = result.rows[0] as unknown as PlayerRow;

  return {
    nameKey: row.name_key,
    displayName: row.display_name,
    totalPoints: row.total_points,
    gamesPlayed: row.games_played,
  };
}

/**
 * Logs a points event and bumps the player's running total. Every finished
 * game round (win, loss, or draw) should call this exactly once so
 * `games_played` reflects actual participation, not just wins.
 */
export async function awardPoints(
  nameKey: string,
  game: string,
  points: number,
  detail?: string
): Promise<number> {
  const db = await getDb();
  const now = Date.now();

  await db.execute({
    sql: `INSERT INTO points_log (id, name_key, game, points, detail, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [randomUUID(), nameKey, game, points, detail ?? null, now],
  });

  await db.execute({
    sql: `UPDATE players
          SET total_points = total_points + ?, games_played = games_played + 1, updated_at = ?
          WHERE name_key = ?`,
    args: [points, now, nameKey],
  });

  const result = await db.execute({
    sql: "SELECT total_points FROM players WHERE name_key = ?",
    args: [nameKey],
  });
  const row = result.rows[0] as unknown as { total_points: number };

  return row.total_points;
}
