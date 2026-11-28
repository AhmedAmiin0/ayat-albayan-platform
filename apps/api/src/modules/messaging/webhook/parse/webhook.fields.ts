import { z } from 'zod';

// Readers for Meta's webhook JSON by its dotted path («interactive.button_reply.id»): lenient, a
// missing or mistyped part reads as absent, never a throw (Meta would retry the body forever).

const containerSchema = z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]);

function child(value: unknown, key: string): unknown {
  const parsed = containerSchema.safeParse(value);
  return parsed.success ? new Map(Object.entries(parsed.data)).get(key) : undefined;
}

/** The value at a dotted path («errors.0.code») of parsed JSON; undefined when absent. */
export function get(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>(child, value);
}

const textSchema = z.union([z.string(), z.number().transform(String)]);

/** A string (or number, as text) at a dotted path; null otherwise. */
export function field(value: unknown, path: string): string | null {
  return textSchema.safeParse(get(value, path)).data ?? null;
}

export const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const first = (...values: (string | null)[]): string | null =>
  values.find((v) => v !== null) ?? null;

/** Unix-seconds string → Date; a missing or bad timestamp is "now". */
export function metaTime(ts: string | null | undefined, now: Date): Date {
  const n = Number(ts);
  return ts && Number.isFinite(n) && n > 0 ? new Date(n * 1000) : now;
}
