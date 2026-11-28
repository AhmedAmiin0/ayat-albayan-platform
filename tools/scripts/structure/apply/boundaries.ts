import type { Domain } from '../map/index.ts';

/** The domain groups as one alternation (`messaging/notifications|teaching/courses`). */
export const groupAlternation = (domains: readonly Domain[]): string =>
  domains.flatMap((d) => d.groups.map((g) => `${d.domain}/${g}`)).join('|');

/** Route files may import a feature's index only, and shared folders freely. */
export function routeGroup(domains: readonly Domain[]): string {
  const groups = domains.flatMap((d) => d.groups.map((g) => `${d.domain}/${g}`));
  const lines = [
    '@/*/**',
    '!@/core/**',
    '!@/shell/**',
    '!@/testing/**',
    '!@/features/*/*',
    '@/features/*/*/**',
    ...groups.flatMap((g) => [`!@/features/${g}/*`, `@/features/${g}/*/**`]),
  ];
  return `[\n    ${lines.map((l) => `'${l}'`).join(',\n    ')},\n  ]`;
}

/** Fills `{G}`, `{D}` and `{R}` in a boundary edit. */
export function fillEdit(text: string, domains: readonly Domain[]): string {
  return text
    .replaceAll('{G}', groupAlternation(domains))
    .replaceAll('{D}', domains.map((d) => d.domain).join('|'))
    .replaceAll('{R}', routeGroup(domains));
}

/** Applies a lint.blocks file's edits; an edit whose text is gone is a problem, not a skip. */
export function editBoundaries(
  text: string,
  edits: readonly (readonly [string, string])[],
  domains: readonly Domain[],
): { text: string; missing: string[] } {
  const missing = edits.filter(([find]) => !text.includes(find)).map(([find]) => find);
  const out = edits.reduce((acc, [find, put]) => acc.replace(find, fillEdit(put, domains)), text);
  return { text: out, missing };
}
