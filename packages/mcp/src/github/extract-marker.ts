export function extractMarker(body: string): string | null {
  const m = /<!--\s*(ai-kit:[^\s]+)\s*-->/.exec(body);
  return m?.[1] ?? null;
}
