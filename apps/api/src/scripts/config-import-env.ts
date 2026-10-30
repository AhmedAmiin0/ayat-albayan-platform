import type { Database } from '@ab/db';
import { isIntegrationSecretKey } from '@ab/shared';
import { createClient } from '@supabase/supabase-js';
import { IntegrationConfigQueries } from '@/common/configuration/integrations/integration-config.queries';
import { loadEnv } from '@/config/env/env';
import { importEnv, type ImportStore } from './import-env';

// `pnpm --filter api config:import-env` (local), or inside the API container:
//   docker compose exec ayat-api node dist/scripts/config-import-env.js [--overwrite]
// Copies the non-empty env values of the integration keys into the database with the service role.
// Keys already in the database are kept unless --overwrite. Prints key names and outcomes only.

async function main(): Promise<void> {
  const env = loadEnv(process.env);
  const db = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const queries = new IntegrationConfigQueries(db);
  const store: ImportStore = {
    existing: async () => {
      const [plain, secrets] = await Promise.all([queries.plainRows(), queries.secretStatus()]);
      return new Set([...plain.map((r) => r.key), ...secrets.map((r) => r.key)]);
    },
    setPlain: (key, value) => queries.writePlain({ [key]: value }, null),
    setSecret: async (key, value) => {
      if (isIntegrationSecretKey(key)) await queries.setSecret({ key, value });
    },
  };
  const lines = await importEnv({ env: process.env, store, overwrite: process.argv.includes('--overwrite') });
  for (const line of lines) process.stdout.write(`${line}\n`);
  process.stdout.write('Done. The API picks the values up within INTEGRATION_REFRESH_MS (unset: SETTINGS_CACHE_MS), or restart it.\n');
}

main().catch((e: unknown) => {
  // The database's message only (never a value: none is ever put in an error here).
  process.stderr.write(`config:import-env failed: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
