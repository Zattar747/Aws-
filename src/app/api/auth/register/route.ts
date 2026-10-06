import { NextRequest, NextResponse } from "next/server";
import { registerPlayer, AuthError } from "@/lib/players";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";
  const password = typeof body?.password === "string" ? body.password : "";

  try {
    const { player, token } = await registerPlayer(name, password);
    return NextResponse.json({ player, token });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
