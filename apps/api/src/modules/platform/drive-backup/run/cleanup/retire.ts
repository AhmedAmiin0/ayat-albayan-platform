import type { ArchiveRow } from '@/modules/platform/drive-backup/plan/archive.types';
import type { RunDeps } from '@/modules/platform/drive-backup/run/backup-store.port';

/** A row whose file id was lost is looked for by its marker this long (Drive's search may lag). */
const LOOK_MS = 7 * 86_400_000;

interface RetireScope {
  folderId: string;
  /** The night: a lost-id row younger than LOOK_MS with no file found yet is kept (seal.ts). */
  now?: Date;
}

/**
 * A row's Drive files: its stored id; else (the id was lost: a failed upload) the files in the
 * folder that carry the backup's marker AND this row's `ab_row`. Never a broader listing.
 */
const filesOf = (deps: RunDeps, folderId: string, r: ArchiveRow): Promise<string[]> =>
  r.drive_file_id === null
    ? deps.api.findMarked({ folderId, rowId: r.id })
    : Promise.resolve([r.drive_file_id]);

/**
 * A lost-id row whose marker search found nothing yet, still young: kept `failed`, so later
 * nights search again (an abort in the last chunk can lose the id of a file Drive did make).
 */
const stillLooking = (r: ArchiveRow, found: number, now: Date | undefined): boolean =>
  r.drive_file_id === null &&
  found === 0 &&
  now !== undefined &&
  now.getTime() - Date.parse(r.started_at) < LOOK_MS;

/**
 * Deletes these rows' Drive files for good (not to Drive's trash, which keeps counting against
 * the shared quota for 30 days), then marks the rows. Only the backup's own rows of this folder,
 * and Drive deletes only a file that carries the backup's marker in that folder (drive-remove.ts);
 * one already gone (404) or not the backup's own is just dropped from the rows. Answers the rows
 * retired (a lost-id row still looked for is not one: stillLooking).
 */
export async function retire(deps: RunDeps, scope: RetireScope, rows: readonly ArchiveRow[]) {
  const { folderId } = scope;
  const done: string[] = [];
  for (const r of rows) {
    const files = await filesOf(deps, folderId, r);
    for (const fileId of files) await deps.api.remove({ fileId, folderId });
    if (!stillLooking(r, files.length, scope.now)) done.push(r.id);
  }
  await deps.store.trashed(done);
  return done.length;
}
