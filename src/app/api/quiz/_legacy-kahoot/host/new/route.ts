import { NextResponse } from "next/server";
import db from "@/lib/db";
import { QUIZ_QUESTIONS } from "@/lib/quiz-questions";
import { buildOptionOrders } from "@/lib/quiz-session";

export const runtime = "nodejs";

// NOTE: this whole route predates the switch to the async @libsql/client
// (see src/lib/db.ts) and still assumes the old synchronous better-sqlite3
// API. It's excluded from the TS build (tsconfig.json) and unreachable
// (Next.js skips "_"-prefixed folders for routing), so it's inert — reviving
// it means updating this file (and its siblings under _legacy-kahoot) to the
// current async db access pattern first.
function generatePin(db: import("better-sqlite3").Database): string {
  const exists = db.prepare("SELECT 1 FROM quiz_games WHERE id = ?");
  let pin: string;
  do {
    pin = String(Math.floor(100000 + Math.random() * 900000));
  } while (exists.get(pin));
  return pin;
}

export async function POST() {
  const pin = generatePin(db);
  const optionOrders = buildOptionOrders();

  db.prepare(
    `INSERT INTO quiz_games (id, status, current_question, option_orders_json, created_at)
     VALUES (?, 'lobby', -1, ?, ?)`
  ).run(pin, JSON.stringify(optionOrders), Date.now());

  return NextResponse.json({ gameId: pin, totalQuestions: QUIZ_QUESTIONS.length });
}
