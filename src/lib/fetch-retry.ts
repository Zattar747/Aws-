/**
 * A fetch wrapper for critical first-touch actions (register/login, starting
 * a game) that retries transient failures instead of surfacing them to the
 * player. Under concurrent load, Turso write contention can briefly return a
 * 5xx with an empty/non-JSON body — that's the same shape of problem the
 * server already retries internally (see lib/db.ts), so the client should
 * give it a second chance too rather than making the player re-click.
 *
 * Only use this for requests that are safe to repeat: every write this app
 * makes on these endpoints is already idempotent/guarded server-side, so a
 * retried request after a lost response is a harmless no-op, not a double
 * effect.
 */
export interface RetryFetchResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

export async function fetchJsonWithRetry<T = unknown>(
  url: string,
  init: RequestInit,
  maxAttempts = 3
): Promise<RetryFetchResult<T>> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      const text = await res.text();
      let data: unknown = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }
      // A 5xx with an unparseable/empty body is exactly what a dropped
      // connection under write contention looks like, not a real
      // application error - worth a retry rather than giving up.
      if (res.status >= 500 && data === null && attempt < maxAttempts) {
        await backoff(attempt);
        continue;
      }
      return { ok: res.ok, status: res.status, data: (data ?? {}) as T };
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await backoff(attempt);
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Network error");
}

function backoff(attempt: number): Promise<void> {
  const jitter = Math.random() * 150;
  return new Promise((r) => setTimeout(r, 200 * attempt + jitter));
}
