import type { Database } from '@ab/db';
import { createClient } from '@supabase/supabase-js';
import { IntegrationConfigRepo } from '@/common/configuration/integrations/integration-config.repo';
import { setIntegrationOverlay } from '@/common/configuration/integrations/integration-overlay';
import { googleEnv, loadEnv, validOverlay } from '@/config/env/env';
import { storageEnv } from '@/config/env/env.storage';
import { BackupStateRepo, httpBackupFactory, restore } from '@/modules/platform/drive-backup';
import { GoogleAccountQueries } from '@/modules/platform/google-sync';
import { parseRestoreArgs, type RestoreArgs } from './drive-restore/args';

// Inside the worker container (docs/45 §5):
//   node dist/scripts/minio-drive-restore.js --to 2026-11-07              dry run: the archives
//   node dist/scripts/minio-drive-restore.js --to 2026-11-07 --apply      put missing objects back
//   … --apply --overwrite                                                 also replace present ones
// Reads the Drive folder of the connected Google account and writes MinIO with the app user's keys.

const need = <T>(value: T | null | undefined, what: string): T => {
  if (value === null || value === undefined) throw new Error(what);
  return value;
};

async function run(args: RestoreArgs) {
  const boot = loadEnv(process.env);
  const auth = { auth: { persistSession: false, autoRefreshToken: false } };
  const db = createClient<Database>(boot.SUPABASE_URL, boot.SUPABASE_SERVICE_ROLE_KEY, auth);
  const overlay = validOverlay(await new IntegrationConfigRepo(db).rawValues(), () => undefined);
  setIntegrationOverlay(overlay);
  const minio = need(storageEnv(loadEnv()).minio, 'MinIO is not configured in «التكاملات»');
  need(googleEnv(loadEnv()), 'the Google OAuth client is not configured');
  const token = need(await new GoogleAccountQueries(db).token(), 'Google is not connected');
  const api = need(httpBackupFactory.drive(token), 'the Google OAuth client is not configured');
  const folderId = need((await new BackupStateRepo(db).read()).folder_id, 'no backup folder yet');
  const source = httpBackupFactory.source(minio);
  return restore({ api, source, folderId, ...args });
}

run(parseRestoreArgs(process.argv.slice(2)))
  .then((summary) => process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`))
  .catch((e: unknown) => {
    process.stderr.write(
      `minio-drive-restore failed: ${e instanceof Error ? e.message : String(e)}\n`,
    );
    process.exit(1);
  });
