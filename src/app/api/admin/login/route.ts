import { NextRequest, NextResponse } from "next/server";
import { loginAdmin } from "@/lib/admin";
import { AuthError } from "@/lib/players";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  try {
    const token = await loginAdmin(password);
    return NextResponse.json({ token });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
