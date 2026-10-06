import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPlayerFromToken, bearerToken, AuthError } from "@/lib/players";
import { getRound } from "@/lib/pictionary-rounds";

export const runtime = "nodejs";

const MAX_STROKES_JSON_LENGTH = 200_000; // guard against a runaway drawing payload

export async function POST(req: NextRequest) {
  try {
    const player = await getPlayerFromToken(bearerToken(req));
    const body = await req.json().catch(() => null);
    const roundId = typeof body?.roundId === "string" ? body.roundId : "";
    const strokes = body?.strokes;

    if (!Array.isArray(strokes)) {
      return NextResponse.json({ error: "Invalid strokes." }, { status: 400 });
    }

    const round = await getRound(roundId);
    if (!round) return NextResponse.json({ error: "Round not found." }, { status: 404 });
    if (round.drawer_key !== player.nameKey) {
      return NextResponse.json({ error: "Only the drawer can draw." }, { status: 403 });
    }
    if (round.status !== "active") {
      return NextResponse.json({ error: "This round has ended." }, { status: 400 });
    }

    const json = JSON.stringify(strokes);
    if (json.length > MAX_STROKES_JSON_LENGTH) {
      return NextResponse.json({ error: "Drawing too large." }, { status: 400 });
    }

    const db = await getDb();
    // The drawer's own client holds the authoritative current drawing and
    // just replaces the whole thing each update — there's only ever one
    // writer per round, so no merge/append logic is needed here.
    await db.execute({
      sql: "UPDATE pictionary_rounds SET strokes_json = ? WHERE id = ? AND status = 'active'",
      args: [json, roundId],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
