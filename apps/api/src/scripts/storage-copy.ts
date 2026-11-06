import type { Database } from '@ab/db';
import { createClient } from '@supabase/supabase-js';
import { IntegrationConfigRepo } from '@/common/configuration/integrations/integration-config.repo';
import { setIntegrationOverlay } from '@/common/configuration/integrations/integration-overlay';
import { BUCKETS } from '@/common/storage/storage.paths';
import { minioStore } from '@/common/storage/store/s3-client';
import { SupabaseStore } from '@/common/storage/store/objects.supabase';
import { loadEnv, validOverlay } from '@/config/env/env';
import { storageEnv } from '@/config/env/env.storage';
import { copyToMinio, tallyLine } from './storage-copy.plan';

// Inside the worker container (docs/45 «Bulk copy»; tools/scripts/storage/copy-to-minio.sh):
//   node dist/scripts/storage-copy.js            dry-run: counts per bucket
//   node dist/scripts/storage-copy.js --apply    copies what MinIO lacks (re-runnable)
// MinIO's config is the one saved in «التكاملات» (env as the fallback). Prints counts only.

async function main(): Promise<void> {
  const boot = loadEnv(process.env);
  const db = createClient<Database>(boot.SUPABASE_URL, boot.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  setIntegrationOverlay(
    validOverlay(await new IntegrationConfigRepo(db).rawValues(), () => undefined),
  );
  const minio = storageEnv(loadEnv()).minio;
  if (!minio)
    throw new Error('MinIO is not configured in «التكاملات» (endpoint, public URL, keys)');
  const apply = process.argv.includes('--apply');
  const plan = {
    from: new SupabaseStore(db),
    to: minioStore(minio),
    buckets: Object.values(BUCKETS),
    apply,
  };
  for (const t of await copyToMinio(plan)) process.stdout.write(`${tallyLine(t)}\n`);
  process.stdout.write(
    apply ? 'Done.\n' : 'Dry run: nothing copied. Run again with --apply to copy.\n',
  );
}

main().catch((e: unknown) => {
  process.stderr.write(`storage-copy failed: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
