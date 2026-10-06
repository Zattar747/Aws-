import { randomUUID, timingSafeEqual } from "crypto";
import { getDb } from "./db";
import { AuthError } from "./players";

export async function loginAdmin(password: string): Promise<string> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new AuthError("Admin login isn't configured on the server.", 500);
  }
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) {
    throw new AuthError("Wrong admin password.", 401);
  }

  const db = await getDb();
  const token = randomUUID();
  await db.execute({
    sql: "INSERT INTO admin_sessions (token, created_at) VALUES (?, ?)",
    args: [token, Date.now()],
  });
  return token;
}

export async function assertAdmin(token: string | null): Promise<void> {
  if (!token) throw new AuthError("Admin login required.", 401);
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT 1 FROM admin_sessions WHERE token = ?",
    args: [token],
  });
  if (result.rows.length === 0) {
    throw new AuthError("Admin session expired. Log in again.", 401);
  }
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}
