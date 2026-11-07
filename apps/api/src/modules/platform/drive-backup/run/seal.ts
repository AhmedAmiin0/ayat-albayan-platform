import type { ArchiveRow, RunPlan } from '@/modules/platform/drive-backup/plan/archive.types';
import { archiveProps, dayLabel } from '@/modules/platform/drive-backup/plan/labels';
import { orphans, toTrash } from '@/modules/platform/drive-backup/plan/retention';
import type { RunDeps } from './backup-store.port';

const lastPart = (rows: readonly ArchiveRow[], label: string): ArchiveRow | undefined =>
  rows
    .filter((r) => r.status === 'done' && r.kind === 'full' && r.label === label)
    .sort((a, b) => a.part - b.part)
    .at(-1);

/**
 * Deletes these rows' Drive files for good (not to Drive's trash, which keeps counting against
 * the shared quota for 30 days), then marks the rows. Only ids from the backup's own rows of this
 * folder, and Drive deletes only a file that carries the backup's marker in that folder
 * (drive-remove.ts); one already gone (404) or not the backup's own is just dropped from the rows.
 */
async function retire(deps: RunDeps, folderId: string, rows: readonly ArchiveRow[]) {
  const fileIds = rows.flatMap((r) => (r.drive_file_id === null ? [] : [r.drive_file_id]));
  for (const fileId of fileIds) await deps.api.remove({ fileId, folderId });
  await deps.store.trashed(rows.map((r) => r.id));
  return rows.length;
}

/** Files of parts that failed after their upload (bookkeeping, a crash): not counted, deleted. */
export async function removeOrphans(deps: RunDeps, folderId: string): Promise<number> {
  return retire(deps, folderId, orphans(await deps.store.archives(folderId)));
}

/**
 * A full whose every object is uploaded: its last part is marked sealed (on Drive, for the restore,
 * and in the table), and only then older archives are deleted (retention).
 */
export async function finishFull(deps: RunDeps, input: { folderId: string; plan: RunPlan }) {
  const last = lastPart(await deps.store.archives(input.folderId), input.plan.label);
  if (!last?.drive_file_id) return { sealed: false, trashed: 0 };
  const props = archiveProps(last, dayLabel(new Date(last.started_at)));
  await deps.api.setProperties({
    fileId: last.drive_file_id,
    appProperties: { ...props, sealed: '1' },
  });
  await deps.store.seal(last.id);
  const old = toTrash(await deps.store.archives(input.folderId));
  return { sealed: true, trashed: await retire(deps, input.folderId, old) };
}
