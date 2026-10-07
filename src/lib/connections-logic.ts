import { shuffle } from "./shuffle";
import { CONNECTIONS_CATEGORIES } from "./connections-words";

export const GRID_ROWS = 8;
export const GRID_COLS = 4;
export const TOTAL_CATEGORIES = CONNECTIONS_CATEGORIES.length; // 8
export const GROUP_SIZE = 4;
export const MAX_MISTAKES = 6;

export interface GridCell {
  word: string;
  category: string;
}

/** Every one of the 32 words, fully shuffled — like NYT Connections, a
 * word's position carries no information about what it groups with. */
export function buildGrid(): GridCell[] {
  const cells: GridCell[] = [];
  for (const category of CONNECTIONS_CATEGORIES) {
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
