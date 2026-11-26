/**
 * A table entry for a name an outside sender chose: own keys only. A decoded zod record is a plain
 * object, so `table['constructor']` would still reach Object.prototype.
 */
export function own<T>(table: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}
