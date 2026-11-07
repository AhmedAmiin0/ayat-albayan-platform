import type { Database } from '@ab/db';
import { createClient } from '@supabase/supabase-js';
import { IntegrationConfigRepo } from '@/common/configuration/integrations/integration-config.repo';
import { setIntegrationOverlay } from '@/common/configuration/integrations/integration-overlay';
import { StorageProbe } from '@/common/storage/probe/storage-probe';
import { minioStore } from '@/common/storage/store/s3-client';
import { SupabaseStore } from '@/common/storage/store/objects.supabase';
import { loadEnv, validOverlay } from '@/config/env/env';
import { storageEnv, type MinioEnv, type StorageEnv } from '@/config/env/env.storage';
import { parseMoveArgs, type MoveArgs } from './storage-move/args';
import { columnsFor } from './storage-move/columns';
import { MoveRepo } from './storage-move/move-db.supabase';
import { moveColumns } from './storage-move/run';
import { surveyColumns } from './storage-move/survey';

// Inside the worker container (docs/45 §6; tools/scripts/storage/move-to-minio.sh):
//   node dist/scripts/storage-move.js                          dry run: counts and a sample
//   node dist/scripts/storage-move.js --apply --table payments one table, re-runnable
// Copies each old Supabase file into MinIO, verifies it, then marks its row «minio:<key>»
// (compare-and-set). Never deletes from Supabase. Prints one JSON summary.

/** The move only makes sense once new files go to MinIO and «اختبار الاتصال» passes. */
async function requireMinio(env: StorageEnv): Promise<MinioEnv> {
  if (env.driver !== 'minio' || !env.minio)
    throw new Error('STORAGE_DRIVER is not minio (or MinIO is not configured) in «التكاملات»');
  await new StorageProbe().run({ config: env.minio });
  return env.minio;
}

async function run(args: MoveArgs) {
  const boot = loadEnv(process.env);
  const auth = { auth: { persistSession: false, autoRefreshToken: false } };
  const db = createClient<Database>(boot.SUPABASE_URL, boot.SUPABASE_SERVICE_ROLE_KEY, auth);
  setIntegrationOverlay(
    validOverlay(await new IntegrationConfigRepo(db).rawValues(), () => undefined),
  );
  const minio = await requireMinio(storageEnv(loadEnv()));
  const loose = createClient(boot.SUPABASE_URL, boot.SUPABASE_SERVICE_ROLE_KEY, auth);
  const repo = new MoveRepo(loose);
  const [from, to] = [new SupabaseStore(db), minioStore(minio)];
  const columns = columnsFor(args.table);
  if (!args.apply) return surveyColumns({ db: repo, from, to, columns, sample: args.sample });
  const stores = { from, to, maxBytes: args.maxBytes };
  const { limit, batch, pauseMs } = args;
  const at = args.after === undefined ? {} : { after: args.after };
  return moveColumns({ db: repo, stores, columns, limit, batch, pauseMs, ...at });
}

run(parseMoveArgs(process.argv.slice(2)))
  .then((summary) => process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`))
  .catch((e: unknown) => {
    process.stderr.write(`storage-move failed: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
