// Content hash of a planned record: same input → same hash on every run, so re-runs plan `skip`.
import { createHash } from 'node:crypto';
import type { TargetRecord } from './types.ts';

/** JSON with object keys sorted at every depth; arrays keep their order. */
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/** sha256 over columns + refs (refs by natural key, so the hash never depends on target uuids). */
export function recordHash(record: TargetRecord): string {
  const { columns, refs } = record;
  return createHash('sha256').update(stableJson({ columns, refs })).digest('hex');
}
