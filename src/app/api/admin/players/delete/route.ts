import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, bearerToken } from "@/lib/admin";
import { AuthError, deletePlayer } from "@/lib/players";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await assertAdmin(bearerToken(req));
    const body = await req.json().catch(() => null);
    const playerKey = body?.playerKey;

    if (typeof playerKey !== "string" || !playerKey) {
      return NextResponse.json({ error: "Invalid player." }, { status: 400 });
    }

    await deletePlayer(playerKey);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
