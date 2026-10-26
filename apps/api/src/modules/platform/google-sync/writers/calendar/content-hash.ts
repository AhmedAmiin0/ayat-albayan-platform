import { createHash } from 'node:crypto';

/** Keys sorted at every level: the same content always hashes the same. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, canonical((value as Record<string, unknown>)[k])]));
  }
  return value;
}

/** sha256 of what the platform would write: equal to the stored hash ⇒ nothing to send (rule 8). */
export const contentHash = (value: unknown): string => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
