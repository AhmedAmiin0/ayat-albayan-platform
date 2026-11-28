import { INBOX_LIST_REFRESH_MS, INBOX_REFRESH_MS, THREAD_FULL_MS } from '@ab/client-core';
import { z } from 'zod';

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing ${name}; run \`pnpm env:local\``);
  return value;
}

/** An optional poll interval in ms: a whole number ≥ 500, else the fallback. */
export function intervalMs(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return raw && Number.isInteger(n) && n >= 500 ? n : fallback;
}

const ORIGIN = z.url({ protocol: /^https?$/ });

/**
 * An optional other app's origin (no trailing slash): '' when unset or not an http(s) URL, so a
 * build without it keeps every link and redirect off (docs/51 §3).
 */
export function optionalOrigin(raw: string | undefined): string {
  const parsed = ORIGIN.safeParse((raw ?? '').trim());
  return parsed.success ? new URL(parsed.data).origin : '';
}

/** The other app's origin, one per build (rule 12: the build env parsed, never trusted). */
const otherApp = z
  .object({ VITE_FAMILY_ORIGIN: z.string().optional(), VITE_STAFF_ORIGIN: z.string().optional() })
  .parse(import.meta.env);

/** One override for every inbox interval (e2e: 1 s). */
const REFRESH = import.meta.env.VITE_INBOX_REFRESH_MS;

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY),
  apiUrl: required('VITE_API_URL', import.meta.env.VITE_API_URL),
  /** The open chat's delta poll (default 10 s); e2e sets 1 s so a status chip shows without a 10 s wait. */
  inboxRefreshMs: intervalMs(REFRESH, INBOX_REFRESH_MS),
  /** The chats list (default 15 s; the e2e value when set). */
  inboxListRefreshMs: intervalMs(REFRESH, INBOX_LIST_REFRESH_MS),
  /** The open chat's full re-read (default 60 s; the e2e value when set). */
  threadFullRefreshMs: intervalMs(REFRESH, THREAD_FULL_MS),
  /** The staff build: the family web app (family.…), where families are sent once it is live. */
  familyOrigin: optionalOrigin(otherApp.VITE_FAMILY_ORIGIN),
  /** The family build: the staff app (app.…), for a staff account's «wrongApp» link. */
  staffOrigin: optionalOrigin(otherApp.VITE_STAFF_ORIGIN),
};
