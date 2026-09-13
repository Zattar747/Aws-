import englishWords from "an-array-of-english-words";
import { getNextIndex } from "./rotation";

/**
 * PLACEHOLDER word list — swap this out once the club sends the real list.
 * Rotation logic below only depends on `ANSWERS` being a flat array of
 * unique, lowercase, 5-letter strings, so replacing this array is enough.
 */
export const ANSWERS: string[] = [
  "cloud", "stack", "query", "array", "index", "logic", "input", "route",
  "build", "debug", "cache", "async", "class", "chain", "block", "graph",
  "layer", "batch", "queue", "token", "shard", "proxy", "agent", "audit",
  "brace", "crane", "drift", "eager", "flare", "grasp", "hatch", "ideal",
  "jolly", "knack", "latch", "mirth", "noble", "orbit", "pixel", "quilt",
  "rally", "spark", "trace", "unity", "vivid", "wharf", "amber", "blaze",
  "crisp", "dwell", "frost", "glint", "hover", "irate", "jumbo", "karma",
  "lemon", "mango", "nudge", "olive", "pearl", "quirk", "raven", "solar",
  "tulip", "unzip", "vapor", "witty", "xenon", "yield", "zesty", "brisk",
  "charm", "delta", "elite", "focal", "grove", "haste", "joust", "kiosk",
  "lunar", "medal", "nifty", "opera", "plaid", "quest", "rider", "swift",
  "tidal", "usher", "valve", "windy",
];

// De-dupe defensively in case the placeholder list above gets edited by hand.
const UNIQUE_ANSWERS = Array.from(new Set(ANSWERS)).filter((w) => w.length === 5);

/**
 * Any real 5-letter English word is accepted as a guess (like NYT Wordle
 * checking against its full valid-guess dictionary) — only ANSWERS above is
 * the smaller, curated pool secret words are drawn from.
 */
export const ALLOWED_GUESSES: Set<string> = new Set(
  (englishWords as string[]).filter((w) => w.length === 5 && /^[a-z]+$/.test(w))
);

// Guarantee every possible answer is guessable even if the dictionary
// package doesn't happen to contain one of the curated placeholder words.
for (const word of UNIQUE_ANSWERS) ALLOWED_GUESSES.add(word);

/**
 * Hands out the next answer from a shuffled, site-wide cycle through
 * ANSWERS. No word repeats until every word in the list has been used
 * once; only then does a new (freshly reshuffled) cycle begin and repeats
 * become possible — matching the club's "don't repeat until exhausted" rule.
 */
export async function getNextWord(): Promise<string> {
  const index = await getNextIndex("wordle-answers", UNIQUE_ANSWERS.length);
  return UNIQUE_ANSWERS[index];
}
