/** The recorded item at `i`; a missing one fails the test here instead of as an `undefined`. */
export function nth<T>(items: readonly T[], i: number): T {
  const item = items[i];
  if (item === undefined) throw new Error(`no item at ${String(i)}`);
  return item;
}
