/** A step's value, or why it stopped. */
export type Result<T> = { ok: true; value: T } | { ok: false; why: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const no = <T>(why: string): Result<T> => ({ ok: false, why });

/** Every item's value in order, or the first item's reason to stop. */
export function all<A, T>(items: readonly A[], f: (a: A) => Result<T>): Result<T[]> {
  const out: T[] = [];
  for (const a of items) {
    const r = f(a);
    if (!r.ok) return no(r.why);
    out.push(r.value);
  }
  return ok(out);
}
