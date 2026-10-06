import { shuffle } from "./shuffle";
import { CONNECTIONS_CATEGORIES } from "./connections-words";

export const GRID_ROWS = 4;
export const GRID_COLS = 8;
export const TOTAL_CATEGORIES = CONNECTIONS_CATEGORIES.length; // 8
export const CONNECTIONS_DURATION_MS = 90_000;

export interface GridCell {
  word: string;
  category: string;
}

/**
 * Lays every category out as a 2x2 block somewhere in the grid. In an
 * 8-directional sense all 4 cells of a 2x2 block are mutual neighbors (every
 * pair among them is horizontally, vertically, or diagonally adjacent), so
 * this guarantees every player's shuffled grid has exactly the same number
 * of valid same-category adjacent pairs to find, however the blocks and the
 * words inside them get randomized — no player gets a luckier or unluckier
 * layout than anyone else.
 */
export function buildGrid(): GridCell[] {
  const blockPositions: number[] = [];
  for (let blockRow = 0; blockRow < GRID_ROWS / 2; blockRow++) {
    for (let blockCol = 0; blockCol < GRID_COLS / 2; blockCol++) {
      blockPositions.push(blockRow * 2 * GRID_COLS + blockCol * 2);
    }
  }

  const shuffledBlocks = shuffle(blockPositions);
  const cells: GridCell[] = new Array(GRID_ROWS * GRID_COLS);

  CONNECTIONS_CATEGORIES.forEach((category, i) => {
    const topLeft = shuffledBlocks[i];
    const offsets = [0, 1, GRID_COLS, GRID_COLS + 1];
    const words = shuffle(category.words);
    offsets.forEach((offset, j) => {
      cells[topLeft + offset] = { word: words[j], category: category.name };
    });
  });

  return cells;
}

export function areAdjacent(posA: number, posB: number): boolean {
  if (posA === posB) return false;
  if (posA < 0 || posB < 0 || posA >= GRID_ROWS * GRID_COLS || posB >= GRID_ROWS * GRID_COLS) return false;
  const rowA = Math.floor(posA / GRID_COLS);
  const colA = posA % GRID_COLS;
  const rowB = Math.floor(posB / GRID_COLS);
  const colB = posB % GRID_COLS;
  return Math.abs(rowA - rowB) <= 1 && Math.abs(colA - colB) <= 1;
}

export function isValidPosition(pos: unknown): pos is number {
  return typeof pos === "number" && Number.isInteger(pos) && pos >= 0 && pos < GRID_ROWS * GRID_COLS;
}
