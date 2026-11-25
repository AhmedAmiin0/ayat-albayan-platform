import type { Database } from '@ab/db';
import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadEnv } from '@/config/env/env';
import { createDb } from './db-client';
import { DbTimeoutFilter } from './db-timeout.filter';

/** Inject with `@Inject(DB) private readonly db: Db`. */
export const DB = Symbol('DB');
export type Db = SupabaseClient<Database>;

/**
 * Typed service-role supabase-js client, global so feature modules only inject `DB`. It bypasses
 * RLS: every route must be guarded (@Permissions / ownership checks) — rule 9, R-NFR-02. Every
 * database call has a deadline (DB_TIMEOUT_MS, default 15 s): a stall is a DbTimeoutError.
 */
@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: (): Db => {
        const env = loadEnv();
        const key = env.SUPABASE_SERVICE_ROLE_KEY;
        return createDb({ url: env.SUPABASE_URL, key, timeoutMs: env.DB_TIMEOUT_MS });
      },
    },
    // A stalled database call answers 503 db_timeout; every other error as before.
    { provide: APP_FILTER, useClass: DbTimeoutFilter },
  ],
  exports: [DB],
})
export class DbModule {}
