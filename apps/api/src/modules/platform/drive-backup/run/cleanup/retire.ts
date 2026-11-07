import type { ArchiveRow } from '@/modules/platform/drive-backup/plan/archive.types';
import type { RunDeps } from '@/modules/platform/drive-backup/run/backup-store.port';

/**
 * A row's Drive files: its stored id; else (the id was lost: a failed upload) the files in the
 * folder that carry the backup's marker AND this row's `ab_row`. Never a broader listing.
 */
const filesOf = (deps: RunDeps, folderId: string, r: ArchiveRow): Promise<string[]> =>
  r.drive_file_id === null
    ? deps.api.findMarked({ folderId, rowId: r.id })
    : Promise.resolve([r.drive_file_id]);

/**
 * Deletes these rows' Drive files for good (not to Drive's trash, which keeps counting against
 * the shared quota for 30 days), then marks the rows. Only the backup's own rows of this folder,
 * and Drive deletes only a file that carries the backup's marker in that folder (drive-remove.ts);
 * one already gone (404) or not the backup's own is just dropped from the rows.
 */
export async function retire(deps: RunDeps, folderId: string, rows: readonly ArchiveRow[]) {
  for (const r of rows) {
    for (const fileId of await filesOf(deps, folderId, r))
      await deps.api.remove({ fileId, folderId });
  }
  await deps.store.trashed(rows.map((r) => r.id));
  return rows.length;
}
