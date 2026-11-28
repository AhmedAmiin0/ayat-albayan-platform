function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const next = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const swap = row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      next.push(Math.min(row[j] + 1, next[j - 1] + 1, swap));
    }
    row = next;
  }
  return row[b.length];
}

/** The allowed name nearest to `name`, for a one-line hint. */
export function closest(name: string, allowed: readonly string[]): string {
  const ranked = [...allowed].sort((x, y) => distance(name, x) - distance(name, y));
  return ranked[0] ?? '(none)';
}
