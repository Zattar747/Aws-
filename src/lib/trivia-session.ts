import { TRIVIA_QUESTIONS, QUIZ_MIX, type TriviaDifficulty } from "./trivia-questions";
import { shuffle } from "./shuffle";

/** Builds one quiz's fixed question order: QUIZ_MIX questions per
 * difficulty, drawn without replacement, then shuffled together. */
export function buildQuizSelection(): number[] {
  const byDifficulty: Record<TriviaDifficulty, number[]> = { easy: [], medium: [], hard: [] };
  TRIVIA_QUESTIONS.forEach((q, i) => byDifficulty[q.difficulty].push(i));

  const selected: number[] = [];
  for (const difficulty of Object.keys(QUIZ_MIX) as TriviaDifficulty[]) {
    const pool = shuffle(byDifficulty[difficulty]);
    selected.push(...pool.slice(0, QUIZ_MIX[difficulty]));
  }
  return shuffle(selected);
}

export function buildOptionOrders(count: number): number[][] {
  return Array.from({ length: count }, () => shuffle([0, 1, 2, 3]));
}

export interface DisplayQuestion {
  question: string;
  options: [string, string, string, string];
  correctDisplayIndex: number;
  explanation: string;
  difficulty: TriviaDifficulty;
}

export function getQuestionForDisplay(questionIndex: number, optionOrder: number[]): DisplayQuestion {
  const original = TRIVIA_QUESTIONS[questionIndex];
  const options = optionOrder.map((i) => original.options[i]) as [string, string, string, string];
  return {
    question: original.question,
    options,
    correctDisplayIndex: optionOrder.indexOf(original.correctIndex),
    explanation: original.explanation,
    difficulty: original.difficulty,
  };
}

export function isValidOptionOrder(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    new Set(value).size === 4 &&
    value.every((n) => Number.isInteger(n) && n >= 0 && n <= 3)
  );
}
