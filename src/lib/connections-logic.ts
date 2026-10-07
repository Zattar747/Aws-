import { shuffle } from "./shuffle";
import { CONNECTIONS_CATEGORIES } from "./connections-words";

export const GROUP_SIZE = 4;
export const CATEGORIES_PER_GAME = 4;
export const TOTAL_CATEGORIES = CATEGORIES_PER_GAME;
export const GRID_COLS = 4;
export const GRID_ROWS = (CATEGORIES_PER_GAME * GROUP_SIZE) / GRID_COLS;
export const MAX_MISTAKES = 8;

export interface GridCell {
  word: string;
  category: string;
}

/**
 * Each player gets a random 4 of the 8 categories (16 words), not the
 * whole pool — so different players are comparing different boards, not
 * all grinding through the identical 32-word set every time. Independent
 * per session, so two players can land on the same 4 by chance; that's
 * fine, just not guaranteed like it would be with the full pool.
 */
export function buildGrid(): GridCell[] {
  const categories = shuffle(CONNECTIONS_CATEGORIES).slice(0, CATEGORIES_PER_GAME);
  const cells: GridCell[] = [];
  for (const category of categories) {
    for (const word of category.words) {
      cells.push({ word, category: category.name });
    }
  }
  return shuffle(cells);
}

export function isValidPosition(pos: unknown): pos is number {
  return typeof pos === "number" && Number.isInteger(pos) && pos >= 0 && pos < GRID_ROWS * GRID_COLS;
}

/** The server's source of truth for how close a wrong guess was: the
 * largest number of the 4 picks that share one category. 4 = a solved
 * group, 2 or 3 = worth a "how many away" hint, anything less isn't close
 * enough to be useful feedback. */
export function maxCategoryOverlap(categories: string[]): { category: string; count: number } {
  const counts = new Map<string, number>();
  for (const c of categories) counts.set(c, (counts.get(c) ?? 0) + 1);
  let best = { category: categories[0], count: 0 };
  for (const [category, count] of counts) {
    if (count > best.count) best = { category, count };
  }
  return best;
}
