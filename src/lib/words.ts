import englishWords from "an-array-of-english-words";
import { getNextIndex } from "./rotation";

/**
 * AWS Club Wordle word list — 145 tech/AWS-themed 5-letter words, from
 * wordlist_n_trivia/aws_club_wordle_words.pdf.
 */
export const ANSWERS: string[] = [
  "cloud", "email", "mouse", "phone", "video",
  "audio", "typed", "files", "pixel", "table",
  "stack", "queue", "array", "input", "model",
  "cache", "image", "sheet", "watch", "robot",
  "logic", "debug", "admin", "token", "login",
  "users", "layer", "nodes", "setup", "build",
  "patch", "alert", "shell", "agent", "codes",
  "proxy", "agile", "cyber", "media", "hosts",
  "ports", "certs", "group", "roles", "fleet",
  "alarm", "batch", "shard", "zones", "vault",
  "scale", "route", "event", "index", "state",
  "speed", "power", "level", "local", "smart",
  "board", "chart", "graph", "field", "timer",
  "clock", "reset", "drive", "flash", "links",
  "share", "store", "touch", "swipe", "click",
  "icons", "panel", "frame", "theme", "style",
  "virus", "hacks", "print", "scans", "bytes",
  "demos", "linux", "feeds", "blogs", "emoji",
  "texts", "chats", "tweet", "wired", "modem",
  "buggy", "error", "crash", "fixed", "digit",
  "coder", "modes", "saved", "loads", "paste",
  "drags", "drops", "trees", "loops", "class",
  "macro", "regex", "split", "merge", "fetch",
  "trace", "async", "await", "const", "float",
  "query", "quota", "limit", "usage", "rules",
  "trust", "claim", "clone", "stage", "mount",
  "probe", "audit", "grant", "relay", "train",
  "infer", "drone", "laser", "cable", "phish",
  "spoof", "worms", "swift", "react", "redux",
];

// De-dupe defensively in case the list above gets edited by hand.
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
// package doesn't happen to contain one of the curated words.
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
