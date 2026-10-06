import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, bearerToken } from "@/lib/admin";
import { AuthError } from "@/lib/players";
import { adminSetPlayerGameLock, type GameName } from "@/lib/game-plays";

export const runtime = "nodejs";

const VALID_GAMES: GameName[] = ["wordle", "trivia", "connections", "pictionary"];

export async function POST(req: NextRequest) {
  try {
    await assertAdmin(bearerToken(req));
    const body = await req.json().catch(() => null);
    const playerKey = body?.playerKey;
    const game = body?.game;
    const locked = body?.locked;

    if (
      typeof playerKey !== "string" ||
      !playerKey ||
      !VALID_GAMES.includes(game) ||
      typeof locked !== "boolean"
    ) {
      return NextResponse.json({ error: "Invalid player, game, or lock value." }, { status: 400 });
    }

    await adminSetPlayerGameLock(playerKey, game as GameName, locked);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
