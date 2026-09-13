import { MEMORY_ICONS } from "./memory-icons";
import { shuffle } from "./shuffle";

export const ICON_LABELS: Record<string, string> = Object.fromEntries(
  MEMORY_ICONS.map((icon) => [icon.id, icon.label])
);

export function buildDeck(pairCount: number): string[] {
  const pool = MEMORY_ICONS.slice(0, pairCount).map((icon) => icon.id);
  return shuffle([...pool, ...pool]);
}

export interface MemoryGameRow {
  id: string;
  mode: "single" | "2p";
  player1_key: string;
  player2_key: string | null;
  deck_json: string;
  matched_json: string;
  pending_index: number | null;
  current_player: 1 | 2;
  moves_count: number;
  scores_json: string;
  status: "in_progress" | "done";
  started_at: number;
  finished_at: number | null;
}

export type Scores = { "1": number; "2": number };
