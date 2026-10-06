/**
 * Central place to tune how many points each game hands out. Every formula
 * is applied server-side only, from data the server itself already knows
 * (word, correct answers, guess count, timing) — never from a client-
 * supplied point value — so there's no way to request your own score.
 */

const WORDLE_MAX_GUESSES = 6;
const WORDLE_POINTS_BY_GUESS = [100, 85, 70, 55, 40, 25]; // index 0 = solved in 1 guess

export function wordlePoints(won: boolean, guessesUsed: number): number {
  if (!won) return 0;
  const index = Math.min(guessesUsed, WORDLE_MAX_GUESSES) - 1;
  return WORDLE_POINTS_BY_GUESS[index] ?? 0;
}

export const TRIVIA_POINTS_BY_DIFFICULTY = {
  easy: 10,
  medium: 20,
  hard: 30,
} as const;

export function triviaQuestionPoints(
  difficulty: keyof typeof TRIVIA_POINTS_BY_DIFFICULTY,
  correct: boolean
): number {
  return correct ? TRIVIA_POINTS_BY_DIFFICULTY[difficulty] : 0;
}

export const CONNECTIONS_POINTS_PER_CATEGORY = 20;

export const PICTIONARY_FULL_POINTS = 100;
export const PICTIONARY_HALF_POINTS = 50;

export function pictionaryGuesserPoints(correct: boolean, close: boolean): number {
  if (correct) return PICTIONARY_FULL_POINTS;
  if (close) return PICTIONARY_HALF_POINTS;
  return 0;
}

/** Drawer earns points proportional to how many guessers they got it across. */
export function pictionaryDrawerPoints(correctCount: number, eligibleGuessers: number): number {
  if (eligibleGuessers <= 0) return 0;
  return Math.round((correctCount / eligibleGuessers) * PICTIONARY_FULL_POINTS);
}
