export interface Point {
  x: number; // normalized 0-1, so a drawing scales correctly across screens
  y: number;
}

export interface Stroke {
  points: Point[];
}

export function renderStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#f5f5fa";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
    for (const p of stroke.points.slice(1)) {
      ctx.lineTo(p.x * width, p.y * height);
    }
    ctx.stroke();
  }
}
