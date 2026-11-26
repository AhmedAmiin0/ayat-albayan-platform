/** `%term%` for `.ilike(column, …)`: LIKE wildcards, `\` and `,` are escaped to match literally. */
export function ilikeContains(value: string): string {
  return `%${value.trim().replace(/[\\%_,]/g, (c) => `\\${c}`)}%`;
}

/** Free text for a PostgREST `or(...)` string: its syntax characters cannot break or widen it. */
export function orFilterTerm(text: string): string {
  return text.replace(/[,()*%\\:"]/g, ' ').trim();
}
