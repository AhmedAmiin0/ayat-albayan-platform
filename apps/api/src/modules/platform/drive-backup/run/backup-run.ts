import type { RunPlan } from '@/modules/platform/drive-backup/plan/archive.types';
import { decide } from '@/modules/platform/drive-backup/plan/decide';
import type { Bucket } from '@/common/storage/storage.paths';
import { isPending, planParts, type Covered } from '@/modules/platform/drive-backup/plan/parts';
import type { ListedObject } from '@/modules/platform/drive-backup/source/backup-source.port';
import type { RunDeps } from './backup-store.port';
import { partOrSkip, type PartDone } from './one-part';
import { ensureRoom } from './room';
import { finishFull, removeOrphans } from './seal';

export interface RunSummary {
  kind: RunPlan['kind'];
  label: string;
  parts: number;
  objects: number;
  skipped: number;
  /** Skipped objects that still exist (a failed read): a full holding them is not sealed. */
  unread: number;
  rawBytes: number;
  compressedBytes: number;
  /** Objects left for the next night (the run's byte cap). */
  left: number;
  sealed: boolean;
  /** Archives deleted from Drive: retention, and files whose bookkeeping failed. */
  trashed: number;
}

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

const added = (sum: RunSummary, r: PartDone): RunSummary => ({
  ...sum,
  parts: sum.parts + 1,
  objects: sum.objects + r.entries.length,
  skipped: sum.skipped + r.skipped.length,
  unread: sum.unread + r.skipped.filter((s) => s.reason === 'read_failed').length,
  rawBytes: sum.rawBytes + r.rawBytes,
  compressedBytes: sum.compressedBytes + r.compressedBytes,
});
/** One big object whose own part failed: skipped, and still to be read. */
const soloFailed = (sum: RunSummary): RunSummary => ({
  ...sum,
  skipped: sum.skipped + 1,
  unread: sum.unread + 1,
});

/**
 * A full is sealed only when it holds every object: nothing left for the next night and no object
 * skipped for a failed read (a vanished one is fine). Otherwise it stays open and the next night
 * continues it, so the restore never takes a full that lacks an object it should hold.
 */
const sealable = (plan: RunPlan, sum: RunSummary): boolean =>
  plan.kind === 'full' && sum.left === 0 && sum.unread === 0;

/**
 * One night (docs/45 §5): remove the files of failed parts, decide the archive, list what is new or
 * changed against the base, upload it in parts (Drive's room checked before each; a failed part
 * stops the run, but for one big object's), then seal a complete full and apply retention.
 */
export async function runBackup(deps: RunDeps, input: { folderId: string; now: Date }) {
  await deps.store.abandon(input.folderId);
  // Planned before the orphans' rows turn `trashed`: their part numbers stay taken (unique).
  const plan = decide(await deps.store.archives(input.folderId), input.now);
  const orphans = await removeOrphans(deps, input.folderId);
  const todo = await pending(deps, await deps.store.covered(plan.base));
  const { parts, left } = planParts(todo, deps.caps);
  const zero = { parts: 0, objects: 0, skipped: 0, unread: 0, rawBytes: 0, compressedBytes: 0 };
  const start = { kind: plan.kind, label: plan.label, left, sealed: false, trashed: orphans };
  let sum: RunSummary = { ...start, ...zero };
  for (const [i, objects] of workOf(plan, parts).entries()) {
    await ensureRoom(deps, objects);
    const r = await partOrSkip({ ...input, deps }, { ...plan, part: plan.firstPart + i }, objects);
    sum = r ? added(sum, r) : soloFailed(sum);
  }
  if (!sealable(plan, sum)) return sum;
  const sealed = await finishFull(deps, { ...input, plan });
  return { ...sum, sealed: sealed.sealed, trashed: sum.trashed + sealed.trashed };
}
