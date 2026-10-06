import { getDb } from "./db";
import { completeGamePlay } from "./game-plays";
import { CONNECTIONS_DURATION_MS, type GridCell } from "./connections-logic";

export interface ConnectionsSessionRow {
  id: string;
  player_key: string;
  grid_json: string;
  solved_json: string;
  score: number;
  started_at: number;
  status: string;
}

export function isExpired(session: ConnectionsSessionRow, now = Date.now()): boolean {
  return now - session.started_at > CONNECTIONS_DURATION_MS;
}

export async function loadSession(sessionId: string, playerKey: string): Promise<ConnectionsSessionRow | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM connections_sessions WHERE id = ? AND player_key = ?",
    args: [sessionId, playerKey],
  });
  return (result.rows[0] as unknown as ConnectionsSessionRow | undefined) ?? null;
}

/**
 * Marks the session done and locks in its score as the final game_plays
 * result. Guarded so finalizing an already-finalized session (e.g. a client
 * retry, or /connect and the timeout racing each other) is a harmless no-op
 * rather than a double award — completeGamePlay has its own guard on top.
 */
export async function finalizeSession(
  playerKey: string,
  session: ConnectionsSessionRow
): Promise<number> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE connections_sessions SET status = 'done' WHERE id = ? AND status = 'in_progress'",
    args: [session.id],
  });
  return completeGamePlay(playerKey, "connections", session.score);
}

export function parseGrid(gridJson: string): GridCell[] {
  return JSON.parse(gridJson);
}
