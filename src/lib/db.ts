import { createClient, type Client } from "@libsql/client";

declare global {
  var __awsArcadeDbClient: Client | undefined;
  var __awsArcadeSchemaReady: Promise<void> | undefined;
}

const SCHEMA = `
  -- generic "don't repeat until exhausted" cursor, shared by any game
  -- with a content pool (word list, trivia questions, ...)
  CREATE TABLE IF NOT EXISTS item_cycles (
    cycle_key TEXT PRIMARY KEY,
    cycle_number INTEGER NOT NULL,
    order_json TEXT NOT NULL,
    pointer INTEGER NOT NULL
  );

  -- one row per person, identified purely by their (normalized) name so
  -- re-entering the same name later resumes the same point total
  CREATE TABLE IF NOT EXISTS players (
    name_key TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    total_points INTEGER NOT NULL DEFAULT 0,
    games_played INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS points_log (
    id TEXT PRIMARY KEY,
    name_key TEXT NOT NULL,
    game TEXT NOT NULL,
    points INTEGER NOT NULL,
    detail TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wordle_games (
    id TEXT PRIMARY KEY,
    player_key TEXT NOT NULL,
    word TEXT NOT NULL,
    guesses_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'in_progress',
    started_at INTEGER NOT NULL,
    finished_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS two_truths_rounds (
    id TEXT PRIMARY KEY,
    player_key TEXT NOT NULL,
    item_index INTEGER NOT NULL,
    chosen_index INTEGER,
    correct INTEGER,
    status TEXT NOT NULL DEFAULT 'in_progress',
    started_at INTEGER NOT NULL,
    finished_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS memory_games (
    id TEXT PRIMARY KEY,
    mode TEXT NOT NULL,
    player1_key TEXT NOT NULL,
    player2_key TEXT,
    deck_json TEXT NOT NULL,
    matched_json TEXT NOT NULL DEFAULT '[]',
    pending_index INTEGER,
    current_player INTEGER NOT NULL DEFAULT 1,
    moves_count INTEGER NOT NULL DEFAULT 0,
    scores_json TEXT NOT NULL DEFAULT '{"1":0,"2":0}',
    status TEXT NOT NULL DEFAULT 'in_progress',
    started_at INTEGER NOT NULL,
    finished_at INTEGER
  );

  -- kept for the shelved host-and-join quiz mode (src/app/*/quiz/_legacy-kahoot) --
  CREATE TABLE IF NOT EXISTS quiz_games (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'lobby',
    current_question INTEGER NOT NULL DEFAULT -1,
    option_orders_json TEXT NOT NULL,
    question_started_at INTEGER,
    created_at INTEGER NOT NULL,
    finished_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS quiz_players (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    player_key TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    joined_at INTEGER NOT NULL,
    UNIQUE(game_id, player_key)
  );

  CREATE TABLE IF NOT EXISTS quiz_answers (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    player_key TEXT NOT NULL,
    question_index INTEGER NOT NULL,
    choice_index INTEGER NOT NULL,
    correct INTEGER NOT NULL,
    points_earned INTEGER NOT NULL,
    answered_at INTEGER NOT NULL,
    UNIQUE(game_id, player_key, question_index)
  );

  -- solo trivia session: one player plays through every question on a
  -- single device, no separate host/join step
  CREATE TABLE IF NOT EXISTS quiz_sessions (
    id TEXT PRIMARY KEY,
    player_key TEXT NOT NULL,
    option_orders_json TEXT NOT NULL,
    current_question INTEGER NOT NULL DEFAULT 0,
    question_started_at INTEGER NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'in_progress',
    started_at INTEGER NOT NULL,
    finished_at INTEGER
  );
`;

function createDbClient(): Client {
  return createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:./data/app.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

// Reused across hot-reloads in dev, and across serverless invocations that
// happen to reuse the same warm instance, so we don't reconnect/re-migrate
// on every request.
const client = global.__awsArcadeDbClient ?? createDbClient();
if (process.env.NODE_ENV !== "production") {
  global.__awsArcadeDbClient = client;
}

async function ensureSchema(): Promise<void> {
  await client.executeMultiple(SCHEMA);
}

const schemaReady = global.__awsArcadeSchemaReady ?? ensureSchema();
if (process.env.NODE_ENV !== "production") {
  global.__awsArcadeSchemaReady = schemaReady;
}

export async function getDb(): Promise<Client> {
  await schemaReady;
  return client;
}
