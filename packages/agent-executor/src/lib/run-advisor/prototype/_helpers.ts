export function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

export function pct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function ms(milliseconds: number): string {
  if (milliseconds >= 60_000) return `${(milliseconds / 60_000).toFixed(1)}m`;
  if (milliseconds >= 1_000)  return `${(milliseconds / 1_000).toFixed(1)}s`;
  return `${Math.round(milliseconds)}ms`;
}
