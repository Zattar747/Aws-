export type LetterState = "correct" | "present" | "absent";

/**
 * Standard duplicate-letter-safe Wordle scoring: exact matches are claimed
 * first, then remaining letters are matched against what's left in the
 * answer so a repeated guess letter can't score more "present" hits than
 * the answer actually contains.
 */
export function scoreGuess(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = new Array(answer.length).fill("absent");
  const remaining: Record<string, number> = {};

  for (const letter of answer) {
    remaining[letter] = (remaining[letter] ?? 0) + 1;
  }

  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
      remaining[guess[i]] -= 1;
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "correct") continue;
    const letter = guess[i];
    if (remaining[letter] > 0) {
      result[i] = "present";
      remaining[letter] -= 1;
    }
  }

  return result;
}
