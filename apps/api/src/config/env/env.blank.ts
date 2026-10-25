import { z } from 'zod';

// The env schema's blank handling: one copy for env.ts, env.kapso.ts, env.google.ts and env.web-push.ts.

/** `KEY=` (empty, as in .env.example) means unset, never a boot failure. */
export const blankIsUnset = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
export const optionalSecret = z.preprocess(blankIsUnset, z.string().trim().min(1).optional());
export const optionalUrl = z.preprocess(blankIsUnset, z.url().optional());
