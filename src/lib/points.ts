/**
 * Central place to tune how many points each game hands out. Numbers are a
 * starting balance, not a spec — adjust freely as prize tiers get defined.
 */

const WORDLE_MAX_GUESSES = 6;

export function wordlePoints(won: boolean, guessesUsed: number): number {
  if (!won) return 5; // participation
  return 20 + (WORDLE_MAX_GUESSES - guessesUsed) * 8;
}

export function twoTruthsPoints(correct: boolean): number {
  return correct ? 15 : 3;
}

export function memorySinglePoints(movesUsed: number, pairCount: number): number {
  const minMoves = pairCount; // best possible: every flip a match
  const extraMoves = Math.max(0, movesUsed - minMoves);
  return Math.max(20, 130 - extraMoves * 5);
}

/**
 * Kahoot-style speed scoring: correct answers are worth more the faster
 * they're submitted, from 100 points (instant) down to 50 (right at the
 * buzzer). Wrong or missed answers score 0.
 */
export function quizPoints(correct: boolean, remainingMs: number, durationMs: number): number {
  if (!correct) return 0;
  const ratio = Math.max(0, Math.min(1, remainingMs / durationMs));
  return Math.round(50 + 50 * ratio);
}

export function memoryTwoPlayerPoints(
  pairsWon: number,
  pairsLost: number
): { winner: number; loser: number; tie: number } {
  const base = 6;
  return {
    winner: 40 + pairsWon * base,
    loser: 10 + pairsLost * base,
    tie: 25 + pairsWon * base,
  };
}
