export function safeInternalPath(
  candidate: string | null | undefined,
  origin: string,
  fallback = "/journal",
): string {
  try {
    const base = new URL(origin);
    const target = new URL(candidate || fallback, base);
    if (target.origin !== base.origin) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
