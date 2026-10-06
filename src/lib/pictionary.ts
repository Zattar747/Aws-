/**
 * Tech-related words that are actually easy to draw — no abstract concepts
 * like "API" or "algorithm", just concrete things with a recognizable shape.
 */
export const PICTIONARY_WORDS: string[] = [
  "cloud", "laptop", "mouse", "keyboard", "robot", "phone", "camera",
  "printer", "router", "battery", "headphones", "monitor", "drone",
  "satellite", "lightbulb", "padlock", "spider", "rocket", "magnet",
  "compass", "bug", "antenna", "globe", "folder", "envelope", "database",
  "joystick", "webcam", "calculator", "flashlight",
];

export const PICTIONARY_ROUND_DURATION_MS = 75_000;

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/** "Close" means a small edit distance from the real word — close enough
 * to show they were on the right track, not an exact match. */
export function isCloseGuess(guess: string | null, word: string): boolean {
  if (!guess) return false;
  const g = guess.trim().toLowerCase();
  const w = word.toLowerCase();
  if (!g || g === w) return false; // exact match is scored as "correct", not "close"
  const distance = levenshtein(g, w);
  return distance <= Math.max(1, Math.floor(w.length / 3));
}

export function isExactGuess(guess: string | null, word: string): boolean {
  if (!guess) return false;
  return guess.trim().toLowerCase() === word.toLowerCase();
}
