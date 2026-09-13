import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { QUESTION_DURATION_MS, QUIZ_QUESTIONS } from "@/lib/quiz-questions";
import { getQuestionForDisplay, type QuizGameRow } from "@/lib/quiz-session";

export const runtime = "nodejs";

interface PlayerScoreRow {
  display_name: string;
  score: number;
}

export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get("gameId") ?? "";
  const playerKey = req.nextUrl.searchParams.get("playerKey");

  const game = db.prepare("SELECT * FROM quiz_games WHERE id = ?").get(gameId) as
    | QuizGameRow
    | undefined;

  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  const base = {
    status: game.status,
    currentQuestion: game.current_question,
    totalQuestions: QUIZ_QUESTIONS.length,
  };

  if (game.status === "lobby") {
    const players = db
      .prepare(
        `SELECT p.display_name AS display_name
         FROM quiz_players qp JOIN players p ON p.name_key = qp.player_key
         WHERE qp.game_id = ? ORDER BY qp.joined_at ASC`
      )
      .all(gameId) as { display_name: string }[];

    return NextResponse.json({ ...base, pin: gameId, players: players.map((p) => p.display_name) });
  }

  const optionOrders: number[][] = JSON.parse(game.option_orders_json);

  if (game.status === "question") {
    const q = getQuestionForDisplay(game.current_question, optionOrders);
    const remainingMs = Math.max(
      0,
      Math.min(QUESTION_DURATION_MS, (game.question_started_at ?? 0) + QUESTION_DURATION_MS - Date.now())
    );
    const { count: answeredCount } = db
      .prepare(
        "SELECT COUNT(*) AS count FROM quiz_answers WHERE game_id = ? AND question_index = ?"
      )
      .get(gameId, game.current_question) as { count: number };
    const { count: totalPlayers } = db
      .prepare("SELECT COUNT(*) AS count FROM quiz_players WHERE game_id = ?")
      .get(gameId) as { count: number };

    let hasAnswered = false;
    if (playerKey) {
      hasAnswered = !!db
        .prepare(
          "SELECT 1 FROM quiz_answers WHERE game_id = ? AND player_key = ? AND question_index = ?"
        )
        .get(gameId, playerKey, game.current_question);
    }

    return NextResponse.json({
      ...base,
      question: q.question,
      options: q.options,
      remainingMs,
      durationMs: QUESTION_DURATION_MS,
      answeredCount,
      totalPlayers,
      hasAnswered,
    });
  }

  if (game.status === "reveal") {
    const q = getQuestionForDisplay(game.current_question, optionOrders);
    const rows = db
      .prepare(
        "SELECT choice_index, COUNT(*) AS count FROM quiz_answers WHERE game_id = ? AND question_index = ? GROUP BY choice_index"
      )
      .all(gameId, game.current_question) as { choice_index: number; count: number }[];
    const counts = [0, 0, 0, 0];
    for (const r of rows) counts[r.choice_index] = r.count;

    const leaderboard = db
      .prepare(
        `SELECT p.display_name AS display_name, qp.score AS score
         FROM quiz_players qp JOIN players p ON p.name_key = qp.player_key
         WHERE qp.game_id = ? ORDER BY qp.score DESC LIMIT 5`
      )
      .all(gameId) as PlayerScoreRow[];

    let myResult = null;
    if (playerKey) {
      myResult = db
        .prepare(
          "SELECT choice_index AS choiceIndex, correct, points_earned AS pointsEarned FROM quiz_answers WHERE game_id = ? AND player_key = ? AND question_index = ?"
        )
        .get(gameId, playerKey, game.current_question) ?? null;
    }

    return NextResponse.json({
      ...base,
      question: q.question,
      options: q.options,
      correctIndex: q.correctDisplayIndex,
      counts,
      leaderboard: leaderboard.map((r) => ({ displayName: r.display_name, score: r.score })),
      myResult,
    });
  }

  // ended
  const finalBoard = db
    .prepare(
      `SELECT p.display_name AS display_name, qp.score AS score
       FROM quiz_players qp JOIN players p ON p.name_key = qp.player_key
       WHERE qp.game_id = ? ORDER BY qp.score DESC`
    )
    .all(gameId) as PlayerScoreRow[];

  return NextResponse.json({
    ...base,
    leaderboard: finalBoard.map((r) => ({ displayName: r.display_name, score: r.score })),
  });
}
