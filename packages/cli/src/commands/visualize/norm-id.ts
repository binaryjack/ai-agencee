export function normId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
}
