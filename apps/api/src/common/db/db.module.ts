import type { Database } from '@ab/db';
import { Global, Module } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadEnv } from '../../env';

/** Inject with `@Inject(DB) private readonly db: Db`. */
export const DB = Symbol('DB');
export type Db = SupabaseClient<Database>;

/**
 * Typed service-role supabase-js client, global so feature modules only inject `DB`.
 * It bypasses RLS: every route must be guarded (@Permissions / ownership checks) — rule 9, R-NFR-02.
 */
@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: (): Db => {
        const env = loadEnv();
        return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      },
    },
  ],
  exports: [DB],
})
export class DbModule {}
