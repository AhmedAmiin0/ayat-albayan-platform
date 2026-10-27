import { CHATS_LIST_MS, THREAD_DELTA_MS, THREAD_FULL_MS } from '@ab/client-core';

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing ${name}; run \`pnpm env:local\``);
  return value;
}

/** An optional poll interval in ms: a whole number ≥ 500, else the fallback. */
export function intervalMs(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return raw && Number.isInteger(n) && n >= 500 ? n : fallback;
}

/** One override for every inbox interval (e2e: 1 s). */
const REFRESH = import.meta.env['VITE_INBOX_REFRESH_MS'];

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL', import.meta.env['VITE_SUPABASE_URL']),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY', import.meta.env['VITE_SUPABASE_ANON_KEY']),
  apiUrl: required('VITE_API_URL', import.meta.env['VITE_API_URL']),
  /** The open chat's delta poll (default 10 s); e2e sets 1 s so a status chip shows without a 10 s wait. */
  inboxRefreshMs: intervalMs(REFRESH, THREAD_DELTA_MS),
  /** The chats list (default 15 s; the e2e value when set). */
  inboxListRefreshMs: intervalMs(REFRESH, CHATS_LIST_MS),
  /** The open chat's full re-read (default 60 s; the e2e value when set). */
  threadFullRefreshMs: intervalMs(REFRESH, THREAD_FULL_MS),
};
