import type { Json } from '@ab/db';

const SECRET_KEY = /pass|token|secret|link|credential|jwt/i;

/** The audit trail never holds a secret: any key that looks like one is dropped, at any depth. */
export function redact(value: Json): Json {
  if (Array.isArray(value)) return value.map(redact);
  if (value === null || typeof value !== 'object') return value;
  const out: { [key: string]: Json } = {};
  for (const [key, v] of Object.entries(value)) {
    if (v !== undefined && !SECRET_KEY.test(key)) out[key] = redact(v);
  }
  return out;
}
