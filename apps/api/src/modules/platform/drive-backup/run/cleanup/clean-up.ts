import { orphans, retireEarly, toTrash } from '@/modules/platform/drive-backup/plan/retention';
import type { RunDeps } from '@/modules/platform/drive-backup/run/backup-store.port';
import { retire } from '@/modules/platform/drive-backup/run/cleanup/retire';

/**
 * The night's first step, before any budget check (it only frees space, docs/45 §5.1): rows left
 * `uploading` by a crash become failed, every failed row's file is deleted (by id, or found by its
 * row marker), and retention that is due (a crash after a seal) runs. Answers the files removed.
 */
export async function cleanUp(deps: RunDeps, folderId: string): Promise<number> {
  await deps.store.abandon(folderId);
  const failed = await retire(deps, folderId, orphans(await deps.store.archives(folderId)));
  const due = await retire(deps, folderId, toTrash(await deps.store.archives(folderId)));
  return failed + due;
}

/** The oldest sealed full and its chain, retired early (retention.ts retireEarly); 0: none. */
export async function retireOldest(deps: RunDeps, folderId: string): Promise<number> {
  return retire(deps, folderId, retireEarly(await deps.store.archives(folderId)));
}
