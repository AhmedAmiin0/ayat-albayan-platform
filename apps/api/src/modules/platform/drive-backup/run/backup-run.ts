import type { Bucket } from '@/common/storage/storage.paths';
import { partCost } from '@/modules/platform/drive-backup/plan/cost';
import { dayLabel } from '@/modules/platform/drive-backup/plan/labels';
import { isPending, planParts } from '@/modules/platform/drive-backup/plan/parts';
import type { ListedObject } from '@/modules/platform/drive-backup/source/backup-source.port';
import type { RunDeps } from './backup-store.port';
import { partOrSkip } from './one-part';
import { budgetOf, freeOf } from './quota';
import { added, emptySummary, soloFailed, tooLargeItems, waited } from './summary';
import type { RunSummary } from './summary';

export type { RunSummary } from './summary';

async function pendingIn(deps: RunDeps, bucket: Bucket, covered: ReadonlySet<string>) {
  const out: ListedObject[] = [];
  for await (const o of deps.source.list(bucket)) if (isPending(covered, o)) out.push(o);
  return out;
}

async function pending(deps: RunDeps, covered: ReadonlySet<string>): Promise<ListedObject[]> {
  const todo: ListedObject[] = [];
  for (const bucket of deps.buckets) todo.push(...(await pendingIn(deps, bucket, covered)));
  return todo;
}

/** Drive's room now: free minus the 2 GB reserve (quota.ts); Infinity without a limit. */
const roomNow = async (deps: RunDeps): Promise<number> => budgetOf(freeOf(await deps.api.quota()));

/** The night's budget: what it started with, less what it already sent (Drive's figure may lag). */
interface Budget {
  start: number;
  spent: number;
}

/**
 * A part goes only under both what the night has left and Drive's room, read again right before
 * it; the local budget first, so Drive is asked only for a part that could still go.
 */
const fitsNow = async (deps: RunDeps, input: { cost: number; budget: Budget }) =>
  input.cost <= input.budget.start - input.budget.spent && input.cost <= (await roomNow(deps));

interface Night {
  folderId: string;
  now: Date;
  label: string;
  /** The first part number: after every row of that night, failed ones included (unique). */
  first: number;
  room: number;
}

/** The parts in order; one that does not fit Drive's room waits (a smaller later one may go). */
async function uploadAll(
  deps: RunDeps,
  night: Night,
  input: { parts: ListedObject[][]; sum: RunSummary },
) {
  const { folderId, now, label } = night;
  const budget: Budget = { start: night.room, spent: 0 };
  let sum = input.sum;
  let part = night.first;
  for (const objects of input.parts) {
    const cost = partCost(objects);
    if (!(await fitsNow(deps, { cost, budget }))) {
      sum = waited(sum, objects);
      continue;
    }
    const r = await partOrSkip({ deps, folderId, now }, { label, part }, objects);
    budget.spent += cost;
    part += 1;
    sum = r.done ? added(sum, r.done) : soloFailed(sum, { objects, why: r.why });
  }
  return sum;
}

/**
 * One add-only night (docs/45 §5): every object whose (bucket, key, ETag) is not recorded yet goes
 * into tonight's parts, within Drive's room above the 2 GB reserve (read again before each part);
 * one larger than the part cap is skipped and named. Nothing on Drive is
 * ever deleted: a failed part's objects simply go again next night under a new part number.
 */
export async function runBackup(deps: RunDeps, input: { folderId: string; now: Date }) {
  const { folderId } = input;
  await deps.store.abandon(folderId);
  const todo = await pending(deps, await deps.store.covered(folderId));
  const room = await roomNow(deps);
  const { parts, tooLarge } = planParts(todo, deps.caps, room);
  const label = dayLabel(input.now);
  const first = (await deps.store.lastPart({ folderId, label })) + 1;
  const start = { ...emptySummary(label), skipped: tooLargeItems(tooLarge) };
  // Not even an empty part fits: nothing goes, everything waits (one quota read, «Drive full»).
  if (room < partCost([])) return waited(start, parts.flat());
  return uploadAll(deps, { ...input, label, first, room }, { parts, sum: start });
}
