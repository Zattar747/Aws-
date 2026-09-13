import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { QUESTION_DURATION_MS } from "@/lib/quiz-questions";
import { getQuestionForDisplay, type QuizGameRow } from "@/lib/quiz-session";
import { quizPoints } from "@/lib/points";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const gameId = typeof body?.gameId === "string" ? body.gameId : "";
  const playerKey = typeof body?.playerKey === "string" ? body.playerKey : "";
  const questionIndex = Number.isInteger(body?.questionIndex) ? body.questionIndex : -1;
  const choiceIndex = Number.isInteger(body?.choiceIndex) ? body.choiceIndex : -1;

  const game = db.prepare("SELECT * FROM quiz_games WHERE id = ?").get(gameId) as
    | QuizGameRow
    | undefined;

  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }
  if (game.status !== "question" || questionIndex !== game.current_question) {
    return NextResponse.json({ error: "This question is no longer active." }, { status: 400 });
  }
  if (choiceIndex < 0 || choiceIndex > 3) {
    return NextResponse.json({ error: "Invalid choice." }, { status: 400 });
  }

  const membership = db
    .prepare("SELECT 1 FROM quiz_players WHERE game_id = ? AND player_key = ?")
    .get(gameId, playerKey);
  if (!membership) {
    return NextResponse.json({ error: "Join the game before answering." }, { status: 404 });
  }

  const optionOrders: number[][] = JSON.parse(game.option_orders_json);
  const { correctDisplayIndex } = getQuestionForDisplay(game.current_question, optionOrders);
  const correct = choiceIndex === correctDisplayIndex;

  const remainingMs = Math.max(
    0,
    Math.min(QUESTION_DURATION_MS, (game.question_started_at ?? 0) + QUESTION_DURATION_MS - Date.now())
  );
  const points = quizPoints(correct, remainingMs, QUESTION_DURATION_MS);

  try {
    db.prepare(
      `INSERT INTO quiz_answers (id, game_id, player_key, question_index, choice_index, correct, points_earned, answered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(randomUUID(), gameId, playerKey, questionIndex, choiceIndex, correct ? 1 : 0, points, Date.now());
  } catch {
    return NextResponse.json({ error: "You already answered this question." }, { status: 400 });
  }

  db.prepare("UPDATE quiz_players SET score = score + ? WHERE game_id = ? AND player_key = ?").run(
    points,
    gameId,
    playerKey
  );

  const { score } = db
    .prepare("SELECT score FROM quiz_players WHERE game_id = ? AND player_key = ?")
    .get(gameId, playerKey) as { score: number };

  return NextResponse.json({ correct, pointsEarned: points, totalScore: score });
}
