import type { Database } from '@ab/db';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { type FetchLike, timedFetch } from '@/common/infra/http/db-fetch';

interface DbClientOptions {
  url: string;
  key: string;
  /** Deadline of each database call (DB_TIMEOUT_MS). */
  timeoutMs: number;
  /** The real fetch; tests pass a slow or fast fake. */
  base?: FetchLike;
}

/** The service-role client: a stalled database call fails fast (DbTimeoutError), never hangs. */
export function createDb(opts: DbClientOptions): SupabaseClient<Database> {
  return createClient<Database>(opts.url, opts.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: timedFetch({ ms: opts.timeoutMs, base: opts.base }) },
  });
}
