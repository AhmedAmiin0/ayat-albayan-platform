/** Edit distance, one row at a time. */
function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  a.split('').forEach((ca, i) => {
    const next = [i + 1];
    b.split('').forEach((cb, j) => {
      const swap = (row[j] ?? 0) + (ca === cb ? 0 : 1);
      next.push(Math.min((row[j + 1] ?? 0) + 1, (next[j] ?? 0) + 1, swap));
    });
    row = next;
  });
  return row.at(-1) ?? 0;
}

/** The allowed name nearest to `name`, for a one-line hint. */
export function closest(name: string, allowed: readonly string[]): string {
  const ranked = [...allowed].sort((x, y) => distance(name, x) - distance(name, y));
  return ranked[0] ?? '(none)';
}
