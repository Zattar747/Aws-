import { createClient, type Client } from "@libsql/client";

declare global {
  var __awsArcadeDbClient: Client | undefined;
  var __awsArcadeSchemaReady: Promise<void> | undefined;
}

const SCHEMA = `
  -- generic "don't repeat until exhausted" cursor, shared by any game with
  -- a content pool (wordle answers, trivia questions per level, ...)
  CREATE TABLE IF NOT EXISTS item_cycles (
    cycle_key TEXT PRIMARY KEY,
    cycle_number INTEGER NOT NULL,
    order_json TEXT NOT NULL,
    pointer INTEGER NOT NULL
  );

  -- a wordle game's secret word has to live server-side (never sent to the
  -- client) so guesses can be checked without exposing the answer
  CREATE TABLE IF NOT EXISTS wordle_games (
    id TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    guesses_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'in_progress'
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
