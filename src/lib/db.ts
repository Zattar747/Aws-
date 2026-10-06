import { createClient, type Client } from "@libsql/client";

declare global {
  var __awsArcadeDbClient: Client | undefined;
  var __awsArcadeSchemaReady: Promise<void> | undefined;
}

const SCHEMA = `
  -- generic "don't repeat until exhausted" cursor for wordle's answer list
  -- and trivia's question order
  CREATE TABLE IF NOT EXISTS item_cycles (
    cycle_key TEXT PRIMARY KEY,
    cycle_number INTEGER NOT NULL,
    order_json TEXT NOT NULL,
    pointer INTEGER NOT NULL
  );

  -- player accounts: name + password, no email. total_points is a cached
  -- sum kept in sync by award_points (see lib/points-ledger.ts) so the
  -- leaderboard query doesn't need to aggregate every row on every read.
  CREATE TABLE IF NOT EXISTS players (
    name_key TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    total_points INTEGER NOT NULL DEFAULT 0,
    points_updated_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  -- bearer session tokens so one logged-in player can't act as another
  CREATE TABLE IF NOT EXISTS player_sessions (
    token TEXT PRIMARY KEY,
    player_key TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  -- one row per (player, game): enforces "you can only play each game once"
  -- and records what they scored. status flow: not_started -> in_progress
  -- -> completed. A completed row is permanent and final.
  CREATE TABLE IF NOT EXISTS game_plays (
    player_key TEXT NOT NULL,
    game TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started',
    points_earned INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER,
    PRIMARY KEY (player_key, game)
  );

  -- admin-controlled per-game availability (e.g. pictionary starts locked
  -- until the admin opens it)
  CREATE TABLE IF NOT EXISTS game_locks (
    game TEXT PRIMARY KEY,
    locked INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  );

  -- wordle: one row per player's single attempt. word stays server-side
  -- only so guesses can be checked without exposing the answer.
  CREATE TABLE IF NOT EXISTS wordle_games (
    id TEXT PRIMARY KEY,
    player_key TEXT NOT NULL,
    word TEXT NOT NULL,
    guesses_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'in_progress'
  );

  -- trivia: one fixed-length quiz per player, played once
  CREATE TABLE IF NOT EXISTS trivia_sessions (
    id TEXT PRIMARY KEY,
    player_key TEXT NOT NULL,
    question_order_json TEXT NOT NULL,
    option_orders_json TEXT NOT NULL,
    current_index INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    question_started_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress'
  );

  -- pictionary: one shared admin-run session, made of rounds
  CREATE TABLE IF NOT EXISTS pictionary_session (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    status TEXT NOT NULL DEFAULT 'idle',
    current_round_id TEXT,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pictionary_rounds (
    id TEXT PRIMARY KEY,
    drawer_key TEXT NOT NULL,
    word TEXT NOT NULL,
    strokes_json TEXT NOT NULL DEFAULT '[]',
    stroke_version INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    duration_ms INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pictionary_round_players (
    round_id TEXT NOT NULL,
    player_key TEXT NOT NULL,
    last_guess TEXT,
    correct_at INTEGER,
    points_earned INTEGER,
    PRIMARY KEY (round_id, player_key)
  );

  -- tracks who has already had a turn drawing, for fair rotation
  CREATE TABLE IF NOT EXISTS pictionary_drawers_used (
    player_key TEXT PRIMARY KEY
  );
`;

function createDbClient(): Client {
  return createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:./data/app.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

const TRANSIENT_ERROR_CODES = new Set([
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
]);

function isTransientNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as NodeJS.ErrnoException).code;
  if (code && TRANSIENT_ERROR_CODES.has(code)) return true;
  const cause = (err as { cause?: unknown }).cause;
  if (cause instanceof Error) {
    const causeCode = (cause as NodeJS.ErrnoException).code;
    if (causeCode && TRANSIENT_ERROR_CODES.has(causeCode)) return true;
  }
  return err.message === "fetch failed";
}

/**
 * Wraps execute() with a couple of retries for transient network blips
 * (a dropped socket to Turso, a connect timeout) — these happen for real
 * under concurrent load and shouldn't surface as a 500 to the player.
 * Safe to retry because every write in this app is already structured as
 * an idempotent, guarded statement (INSERT ... ON CONFLICT, or an UPDATE
 * gated on the row still being in its expected prior state), specifically
 * so a duplicate attempt is a harmless no-op rather than a double effect.
 */
function wrapClientWithRetry(target: Client): Client {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      if (prop === "execute") {
        return async (...args: Parameters<Client["execute"]>) => {
          const maxAttempts = 3;
          for (let attempt = 1; ; attempt++) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return await (obj.execute as any)(...args);
            } catch (err) {
              if (attempt >= maxAttempts || !isTransientNetworkError(err)) throw err;
              await new Promise((r) => setTimeout(r, 75 * attempt));
            }
          }
        };
      }
      const value = Reflect.get(obj, prop, receiver);
      return typeof value === "function" ? value.bind(obj) : value;
    },
  });
}

// Reused across hot-reloads in dev, and across serverless invocations that
// happen to reuse the same warm instance, so we don't reconnect/re-migrate
// on every request.
const rawClient = global.__awsArcadeDbClient ?? createDbClient();
if (process.env.NODE_ENV !== "production") {
  global.__awsArcadeDbClient = rawClient;
}
const client = wrapClientWithRetry(rawClient);

async function ensureSchema(): Promise<void> {
  await client.executeMultiple(SCHEMA);
  // Pictionary is the event's final/group game — it starts locked until
  // the admin opens it, unlike the others which are open from the start.
  await client.execute(
    `INSERT INTO game_locks (game, locked, updated_at) VALUES ('pictionary', 1, ${Date.now()})
     ON CONFLICT(game) DO NOTHING`
  );
}

let schemaReady: Promise<void> | undefined = global.__awsArcadeSchemaReady;

export async function getDb(): Promise<Client> {
  if (!schemaReady) {
    // If this fails (e.g. a transient network error on a cold start), clear
    // it so the *next* call retries instead of every future request on this
    // warm instance re-throwing the same cached rejection forever.
    schemaReady = ensureSchema().catch((err) => {
      schemaReady = undefined;
      if (process.env.NODE_ENV !== "production") global.__awsArcadeSchemaReady = undefined;
      throw err;
    });
    if (process.env.NODE_ENV !== "production") {
      global.__awsArcadeSchemaReady = schemaReady;
    }
  }
  await schemaReady;
  return client;
}
