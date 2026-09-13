export type TileShape = "triangle" | "diamond" | "circle" | "square";

export interface TileStyle {
  shape: TileShape;
  color: string;
}

// Color + shape are always paired (never color alone) so the tiles stay
// distinguishable regardless of color vision — same idea Kahoot uses.
export const TILE_STYLES: TileStyle[] = [
  { shape: "triangle", color: "#f43f5e" },
  { shape: "diamond", color: "#38bdf8" },
  { shape: "circle", color: "#ff9900" },
  { shape: "square", color: "#a855f7" },
];
