import type { ArchiveRow, RunPlan } from '@/modules/platform/drive-backup/plan/archive.types';
import { archiveProps, dayLabel } from '@/modules/platform/drive-backup/plan/labels';
import { toTrash } from '@/modules/platform/drive-backup/plan/retention';
import type { RunDeps } from '@/modules/platform/drive-backup/run/backup-store.port';
import { retire } from '@/modules/platform/drive-backup/run/cleanup/retire';

const partsOf = (rows: readonly ArchiveRow[], label: string): ArchiveRow[] =>
  rows
    .filter((r) => r.status === 'done' && r.kind === 'full' && r.label === label)
    .sort((a, b) => a.part - b.part);

const isThere = (deps: RunDeps, folderId: string, r: ArchiveRow): Promise<boolean> =>
  r.drive_file_id === null
    ? Promise.resolve(false)
    : deps.api.present({ fileId: r.drive_file_id, folderId });

/** Done parts whose Drive file is not there (one GET by id each, never a listing that may lag). */
async function missing(deps: RunDeps, folderId: string, parts: readonly ArchiveRow[]) {
  const out: ArchiveRow[] = [];
  for (const r of parts) if (!(await isThere(deps, folderId, r))) out.push(r);
  return out;
}

/**
 * A full whose every object is uploaded: each done part's file is checked on Drive first; a part
 * whose file is gone is retired (its objects go again next night) and the full stays open. Else
 * its last part is marked sealed (on Drive, for the restore, and in the table), and only then
 * older archives are deleted (retention).
 */
export async function finishFull(deps: RunDeps, input: { folderId: string; plan: RunPlan }) {
  const { folderId } = input;
  const parts = partsOf(await deps.store.archives(folderId), input.plan.label);
  const gone = await missing(deps, folderId, parts);
  const last = parts.at(-1);
  if (gone.length > 0 || !last?.drive_file_id)
    return { sealed: false, trashed: await retire(deps, { folderId }, gone) };
  const props = archiveProps(last, dayLabel(new Date(last.started_at)));
  await deps.api.setProperties({
    fileId: last.drive_file_id,
    appProperties: { ...props, sealed: '1' },
  });
  await deps.store.seal(last.id);
  const old = toTrash(await deps.store.archives(folderId));
  return { sealed: true, trashed: await retire(deps, { folderId }, old) };
}
