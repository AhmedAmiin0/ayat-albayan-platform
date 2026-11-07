import type { Bucket } from '@/common/storage/storage.paths';
import type { RunPlan } from '@/modules/platform/drive-backup/plan/archive.types';
import { partCost } from '@/modules/platform/drive-backup/plan/cost';
import { decide } from '@/modules/platform/drive-backup/plan/decide';
import {
  isPending,
  objectId,
  planParts,
  type Covered,
} from '@/modules/platform/drive-backup/plan/parts';
import type { ListedObject } from '@/modules/platform/drive-backup/source/backup-source.port';
import type { RunDeps } from './backup-store.port';
import { cleanUp } from '@/modules/platform/drive-backup/run/cleanup/clean-up';
import { partOrSkip } from './one-part';
import { DriveFull } from './quota';
import { fitsNow, roomFor } from './room';
import { finishFull } from '@/modules/platform/drive-backup/run/cleanup/seal';
import { added, emptySummary, sealable, soloFailed, type RunSummary } from './summary';

export type { RunSummary } from './summary';

async function pendingIn(deps: RunDeps, bucket: Bucket, covered: Covered) {
  const out: ListedObject[] = [];
  for await (const o of deps.source.list(bucket)) if (isPending(covered, o)) out.push(o);
  return out;
}

async function pending(deps: RunDeps, covered: Covered): Promise<ListedObject[]> {
  const todo: ListedObject[] = [];
  for (const bucket of deps.buckets) todo.push(...(await pendingIn(deps, bucket, covered)));
  return todo;
}

/** A first full of an empty MinIO still uploads one (manifest-only) part: the chain's base. */
const workOf = (plan: RunPlan, parts: ListedObject[][]): ListedObject[][] =>
  plan.kind === 'full' && plan.base.length === 0 && parts.length === 0 ? [[]] : parts;

interface Night {
  folderId: string;
  now: Date;
  plan: RunPlan;
  /** The first part number: after every row of that archive, trashed ones included (unique). */
  first: number;
}

/** The parts in order, each checked against Drive's room right before it (room.ts fitsNow). */
async function uploadAll(
  deps: RunDeps,
  night: Night,
  input: { work: ListedObject[][]; sum: RunSummary },
) {
  const { folderId, now, plan } = night;
  let sum = input.sum;
  let part = night.first;
  for (const [i, objects] of input.work.entries()) {
    const fits = await fitsNow(deps, { part: objects, later: input.work.slice(i + 1) });
    if (!fits) {
      sum = { ...sum, left: sum.left + objects.length };
      continue;
    }
    const r = await partOrSkip({ deps, folderId, now }, { ...plan, part }, objects);
    part += 1;
    sum = r ? added(sum, r) : soloFailed(sum);
  }
  return sum;
}

/**
 * The night after its clean-up: decide the archive, list what is new or changed against the base,
 * make room (an open full retires the oldest sealed full early), skip what is larger than the
 * room, upload the rest in parts, then seal a complete full and apply retention.
 */
async function backUp(deps: RunDeps, input: { folderId: string; now: Date }) {
  const { folderId } = input;
  const plan = decide(await deps.store.archives(folderId), input.now);
  const todo = await pending(deps, await deps.store.covered(plan.base));
  const need = plan.kind === 'full' ? partCost(todo) : null;
  const { room, trashed } = await roomFor(deps, { folderId, need });
  if (room < partCost([])) throw new DriveFull();
  const { parts, left, tooLarge } = planParts(todo, deps.caps, room);
  const last = await deps.store.lastPart({ folderId, kind: plan.kind, label: plan.label });
  const start = { ...emptySummary(plan), left, trashed, tooLarge: tooLarge.map(objectId) };
  const night = { ...input, plan, first: last + 1 };
  const sum = await uploadAll(deps, night, { work: workOf(plan, parts), sum: start });
  if (!sealable(plan, sum)) return sum;
  const sealed = await finishFull(deps, { folderId, plan });
  return { ...sum, sealed: sealed.sealed, trashed: sum.trashed + sealed.trashed };
}

/** One night (docs/45 §5): the clean-up (it only frees space), then the backup itself. */
export async function runBackup(deps: RunDeps, input: { folderId: string; now: Date }) {
  const removed = await cleanUp(deps, input.folderId);
  const sum = await backUp(deps, input);
  return { ...sum, trashed: sum.trashed + removed };
}
