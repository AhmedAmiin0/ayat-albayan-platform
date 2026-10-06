import type { Json } from '@ab/db';

/**
 * A secret key: pass / token / secret / jwt anywhere in the name, `link` or `credential` only as its
 * LAST word (action_link, recoveryLink, credential), so audit keys such as `linked` and
 * `credential_mode` survive.
 */
const SECRET_KEY = /pass|token|secret|jwt|link$|credential$/i;

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
