import { randomUUID } from "crypto";
import { LibsqlError } from "@libsql/client";
import { getDb } from "./db";
import { hashPassword, verifyPassword } from "./password";

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface PlayerRecord {
  nameKey: string;
  displayName: string;
  totalPoints: number;
}

interface PlayerRow {
  name_key: string;
  display_name: string;
  password_hash: string;
  total_points: number;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

function toRecord(row: PlayerRow): PlayerRecord {
  return { nameKey: row.name_key, displayName: row.display_name, totalPoints: row.total_points };
}

function isConstraintViolation(err: unknown): boolean {
  return err instanceof LibsqlError && err.code.includes("CONSTRAINT");
}

export async function registerPlayer(
  rawName: string,
  password: string
): Promise<{ player: PlayerRecord; token: string }> {
  const nameKey = normalizeName(rawName);
  const displayName = rawName.trim();
  if (!nameKey || nameKey.length > 30) {
    throw new AuthError("Name must be 1-30 characters.", 400);
  }
  if (!password || password.length < 4) {
    throw new AuthError("Password must be at least 4 characters.", 400);
  }

  const passwordHash = await hashPassword(password);
  const now = Date.now();
  const token = randomUUID();
  const db = await getDb();

  try {
    // One round trip, and racing registrations for the same name can't both
    // win: the PRIMARY KEY constraint on name_key is what actually decides
    // it, not a separate (and racy) "does this name exist" read beforehand.
    // If the player insert fails, the whole batch rolls back — no orphaned
    // session left behind for a registration that didn't happen.
    await db.batch([
      {
        sql: `INSERT INTO players (name_key, display_name, password_hash, total_points, points_updated_at, created_at)
              VALUES (?, ?, ?, 0, ?, ?)`,
        args: [nameKey, displayName, passwordHash, now, now],
      },
      {
        sql: "INSERT INTO player_sessions (token, player_key, created_at) VALUES (?, ?, ?)",
        args: [token, nameKey, now],
      },
    ]);
  } catch (err) {
    if (isConstraintViolation(err)) {
      throw new AuthError("That name is already taken. Choose a different one.", 409);
    }
    throw err;
  }

  return { player: { nameKey, displayName, totalPoints: 0 }, token };
}

export async function loginPlayer(
  rawName: string,
  password: string
): Promise<{ player: PlayerRecord; token: string }> {
  const nameKey = normalizeName(rawName);
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM players WHERE name_key = ?",
    args: [nameKey],
  });
  const row = result.rows[0] as unknown as PlayerRow | undefined;
  if (!row) {
    throw new AuthError("No account with that name. Check your spelling or register.", 404);
  }
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) {
    throw new AuthError("Wrong password.", 401);
  }
  const token = randomUUID();
  await db.execute({
    sql: "INSERT INTO player_sessions (token, player_key, created_at) VALUES (?, ?, ?)",
    args: [token, nameKey, Date.now()],
  });
  return { player: toRecord(row), token };
}

/**
 * Resolves a bearer session token to the player it belongs to. Every
 * points-awarding route must go through this rather than trusting a
 * client-supplied player name/key directly — otherwise anyone could spoof
 * another player's identity in a request body.
 */
export async function getPlayerFromToken(token: string | null): Promise<PlayerRecord> {
  if (!token) throw new AuthError("Not logged in.", 401);
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT p.* FROM player_sessions s
          JOIN players p ON p.name_key = s.player_key
          WHERE s.token = ?`,
    args: [token],
  });
  const row = result.rows[0] as unknown as PlayerRow | undefined;
  if (!row) throw new AuthError("Session expired. Log in again.", 401);
  return toRecord(row);
}

/**
 * Removes a player and every row of their own personal game data. Doesn't
 * touch pictionary_rounds even for rounds they drew — that round's strokes
 * and other players' guesses/points are shared data, not this player's
 * alone, so deleting them would corrupt other players' history. Freeing
 * the name_key also means someone else can register that name afterward.
 */
export async function deletePlayer(nameKey: string): Promise<void> {
  const db = await getDb();
  await db.batch([
    { sql: "DELETE FROM player_sessions WHERE player_key = ?", args: [nameKey] },
    { sql: "DELETE FROM game_plays WHERE player_key = ?", args: [nameKey] },
    { sql: "DELETE FROM wordle_games WHERE player_key = ?", args: [nameKey] },
    { sql: "DELETE FROM trivia_sessions WHERE player_key = ?", args: [nameKey] },
    { sql: "DELETE FROM connections_sessions WHERE player_key = ?", args: [nameKey] },
    { sql: "DELETE FROM pictionary_round_players WHERE player_key = ?", args: [nameKey] },
    { sql: "DELETE FROM pictionary_drawers_used WHERE player_key = ?", args: [nameKey] },
    { sql: "DELETE FROM players WHERE name_key = ?", args: [nameKey] },
  ]);
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}
