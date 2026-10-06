import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { assertAdmin, bearerToken } from "@/lib/admin";
import { AuthError } from "@/lib/players";
import { getRound, endRoundIfNeeded } from "@/lib/pictionary-rounds";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await assertAdmin(bearerToken(req));
    const db = await getDb();

    const sessionResult = await db.execute("SELECT current_round_id FROM pictionary_session WHERE id = 1");
    const roundId = (sessionResult.rows[0] as unknown as { current_round_id: string } | undefined)
      ?.current_round_id;
    if (!roundId) {
      return NextResponse.json({ error: "No active round." }, { status: 400 });
    }

    const round = await getRound(roundId);
    if (!round) {
      return NextResponse.json({ error: "Round not found." }, { status: 404 });
    }

    await endRoundIfNeeded(round, true);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
