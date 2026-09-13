import type { TileShape } from "@/lib/quiz-tiles";

export default function ShapeIcon({ shape, size = 28 }: { shape: TileShape; size?: number }) {
  const common = { width: size, height: size, fill: "white" };
  switch (shape) {
    case "triangle":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <polygon points="12,3 22,20 2,20" />
        </svg>
      );
    case "diamond":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <polygon points="12,2 22,12 12,22 2,12" />
        </svg>
      );
    case "circle":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
    case "square":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="3" y="3" width="18" height="18" />
        </svg>
      );
  }
}
