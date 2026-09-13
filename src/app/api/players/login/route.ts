import { NextRequest, NextResponse } from "next/server";
import { getOrCreatePlayer } from "@/lib/players";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name || name.length > 30) {
    return NextResponse.json(
      { error: "Enter a name (1-30 characters)." },
      { status: 400 }
    );
  }

  const player = await getOrCreatePlayer(name);
  return NextResponse.json(player);
}
