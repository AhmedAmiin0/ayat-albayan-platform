/** Two sources on one target, and a target a staying file already holds. */
export function targetProblems(
  files: readonly string[],
  pairs: readonly [string, string][],
): string[] {
  const moving = new Set(pairs.map(([from]) => from));
  const byTarget = new Map<string, string[]>();
  pairs.forEach(([from, to]) => byTarget.set(to, [...(byTarget.get(to) ?? []), from]));
  const staying = new Set(files.filter((f) => !moving.has(f)));
  return [...byTarget].flatMap(([to, froms]) => {
    if (froms.length > 1) return [`two sources on one target: ${to} (${froms.join(', ')})`];
    if (staying.has(to)) return [`target exists: ${to} (from ${froms.join(', ')})`];
    return [];
  });
}
