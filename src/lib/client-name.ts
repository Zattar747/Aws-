const KEY = "awsArcade:lastName";

// Convenience prefill only — the server is the source of truth for identity
// and points, so a cleared/blocked localStorage just means retyping a name.
export function getLastPlayerName(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function setLastPlayerName(name: string): void {
  try {
    localStorage.setItem(KEY, name);
  } catch {
    // ignore
  }
}
