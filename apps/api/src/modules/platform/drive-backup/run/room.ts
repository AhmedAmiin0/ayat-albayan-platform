import { partCost } from '@/modules/platform/drive-backup/plan/cost';
import type { ListedObject } from '@/modules/platform/drive-backup/source/backup-source.port';
import type { RunDeps } from './backup-store.port';
import { retireOldest } from '@/modules/platform/drive-backup/run/cleanup/clean-up';
import { budgetOf, DriveFull, freeOf } from './quota';

/** Drive's room now: free space minus the reserve (Gmail and the Google sync share the account). */
const roomNow = async (deps: Pick<RunDeps, 'api'>): Promise<number> =>
  budgetOf(freeOf(await deps.api.quota()));

/**
 * Before each part, Drive's room is read again (docs/45 §5.1): a part that would eat into the
 * reserve is not sent. It waits for the next night while a later part still fits; when none does,
 * the run stops (DriveFull): the shared account never fills.
 */
export async function fitsNow(
  deps: Pick<RunDeps, 'api'>,
  input: { part: readonly ListedObject[]; later: readonly ListedObject[][] },
): Promise<boolean> {
  const room = await roomNow(deps);
  const fits = (p: readonly ListedObject[]) => partCost(p) <= room;
  if (fits(input.part)) return true;
  if (!input.later.some(fits)) throw new DriveFull();
  return false;
}

/**
 * Tonight's room. A full that needs more than it (`need`) retires the oldest sealed full early,
 * again while needed and while one sealed full and its chain stay (retention.ts retireEarly):
 * Drive never has to hold one full more than it keeps. Answers the room and the files removed.
 */
export async function roomFor(deps: RunDeps, input: { folderId: string; need: number | null }) {
  let room = await roomNow(deps);
  let trashed = 0;
  for (let n = 1; input.need !== null && input.need > room && n > 0;) {
    n = await retireOldest(deps, input.folderId);
    trashed += n;
    room = await roomNow(deps);
  }
  return { room, trashed };
}
