import { QUIZ_QUESTIONS } from "./quiz-questions";
import { shuffle } from "./shuffle";

export function buildOptionOrders(): number[][] {
  return QUIZ_QUESTIONS.map(() => shuffle([0, 1, 2, 3]));
}

export interface DisplayQuestion {
  question: string;
  options: string[];
  correctDisplayIndex: number;
}

/**
 * Every placeholder question lists its correct answer first, so the raw
 * option order can't be shown as-is — that would let players win by always
 * tapping the same tile. `optionOrders[qIndex]` is a per-game shuffle of
 * [0,1,2,3] computed once at game creation; this maps the original option
 * positions through it to get what's actually displayed.
 */
export function getQuestionForDisplay(qIndex: number, optionOrders: number[][]): DisplayQuestion {
  const original = QUIZ_QUESTIONS[qIndex];
  const perm = optionOrders[qIndex];
  return {
    question: original.question,
    options: perm.map((origIdx) => original.options[origIdx]),
    correctDisplayIndex: perm.indexOf(original.correctIndex),
  };
}

// generatePin() lived here for the shelved host-and-join quiz mode
// (src/app/*/quiz/_legacy-kahoot); it's self-contained in that route now.

export interface QuizGameRow {
  id: string;
  status: "lobby" | "question" | "reveal" | "ended";
  current_question: number;
  option_orders_json: string;
  question_started_at: number | null;
  created_at: number;
  finished_at: number | null;
}

export interface QuizSessionRow {
  id: string;
  player_key: string;
  option_orders_json: string;
  current_question: number;
  question_started_at: number;
  score: number;
  status: "in_progress" | "done";
  started_at: number;
  finished_at: number | null;
}
