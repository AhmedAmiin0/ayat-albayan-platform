import type { ListedObject } from '@/modules/platform/drive-backup/source/backup-source.port';
import type { RunDeps } from './backup-store.port';
import { budgetOf, DriveFull, freeOf, partCost } from './quota';

/**
 * Before each part: Drive's free space is read again (Gmail and the Google sync share it), and a
 * part that would eat into the reserve stops the run (docs/45 §5.1): the shared account never
 * fills.
 */
export async function ensureRoom(deps: Pick<RunDeps, 'api'>, objects: readonly ListedObject[]) {
  const room = budgetOf(freeOf(await deps.api.quota()));
  if (partCost(objects) > room) throw new DriveFull();
}
