import { TRIVIA_QUESTIONS, type TriviaLevel } from "./trivia-questions";
import { shuffle } from "./shuffle";

export const TRIVIA_LEVELS: TriviaLevel[] = ["easy", "medium", "hard"];

export function isTriviaLevel(value: unknown): value is TriviaLevel {
  return typeof value === "string" && (TRIVIA_LEVELS as string[]).includes(value);
}

export function buildOptionOrder(): number[] {
  return shuffle([0, 1, 2, 3]);
}

export function isValidOptionOrder(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    new Set(value).size === 4 &&
    value.every((n) => Number.isInteger(n) && n >= 0 && n <= 3)
  );
}

export interface DisplayQuestion {
  question: string;
  options: [string, string, string, string];
  correctDisplayIndex: number;
  explanation: string;
  icon?: string;
}

/**
 * Every question lists options in a fixed order (matching the source
 * answer key), so the raw order can't be shown as-is — that would let
 * players win by always tapping the same position. `optionOrder` is a
 * fresh shuffle of [0,1,2,3] generated per question request; this maps the
 * original option positions through it to get what's actually displayed.
 */
export function getQuestionForDisplay(
  level: TriviaLevel,
  index: number,
  optionOrder: number[]
): DisplayQuestion {
  const original = TRIVIA_QUESTIONS[level][index];
  const options = optionOrder.map((origIdx) => original.options[origIdx]) as [
    string,
    string,
    string,
    string,
  ];
  return {
    question: original.question,
    options,
    correctDisplayIndex: optionOrder.indexOf(original.correctIndex),
    explanation: original.explanation,
    icon: original.icon,
  };
}
