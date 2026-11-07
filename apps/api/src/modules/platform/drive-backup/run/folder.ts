import type { DriveBackupApi } from '@/modules/platform/drive-backup/drive/drive-backup.port';
import type { BackupState } from '@/modules/platform/drive-backup/db/backup-state.repo';

/** The Drive folder's name (owner 2026-11-07): a data name on Drive, not UI copy. */
const FOLDER_NAME = 'نسخ احتياطي — ملفات المنصة';

interface StateIo {
  read(): Promise<BackupState>;
  save(patch: Partial<BackupState>): Promise<void>;
}

/**
 * The backup folder of the account the token belongs to: the stored one while it is that
 * account's, still there and still the backup's own; else the backup's own folder found by name
 * in that account, else a new one (created once, its id stored). A reconnect to another account
 * never writes into the old account's folder id: the chain (archives are per folder) starts over.
 */
export async function ensureFolder(api: DriveBackupApi, state: StateIo, email: string) {
  const s = await state.read();
  const ownId = s.account_email === email ? s.folder_id : null;
  const kept = ownId ? await api.folder(ownId) : null;
  if (kept) return kept.id;
  const found = (await api.findFolders(FOLDER_NAME)).at(0);
  const id = found?.id ?? (await api.createFolder(FOLDER_NAME));
  await state.save({ folder_id: id, account_email: email });
  return id;
}
