import type { ArchiveRow, RunPlan } from '@/modules/platform/drive-backup/plan/archive.types';
import { archiveProps, dayLabel } from '@/modules/platform/drive-backup/plan/labels';
import { toTrash } from '@/modules/platform/drive-backup/plan/retention';
import type { RunDeps } from '@/modules/platform/drive-backup/run/backup-store.port';
import { retire } from '@/modules/platform/drive-backup/run/cleanup/retire';

const lastPart = (rows: readonly ArchiveRow[], label: string): ArchiveRow | undefined =>
  rows
    .filter((r) => r.status === 'done' && r.kind === 'full' && r.label === label)
    .sort((a, b) => a.part - b.part)
    .at(-1);

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
