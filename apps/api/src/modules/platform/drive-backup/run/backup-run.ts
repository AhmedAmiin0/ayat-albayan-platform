import { classify, errorText } from '@/modules/platform/google-sync';
import type { ArchiveRow, RunPlan } from '@/modules/platform/drive-backup/plan/archive.types';
import { decide } from '@/modules/platform/drive-backup/plan/decide';
import type { Bucket } from '@/common/storage/storage.paths';
import { archiveName, archiveProps, dayLabel } from '@/modules/platform/drive-backup/plan/labels';
import {
  isPending,
  isSolo,
  planParts,
  type Covered,
} from '@/modules/platform/drive-backup/plan/parts';
import type { ListedObject } from '@/modules/platform/drive-backup/source/backup-source.port';
import type { RunDeps } from './backup-store.port';
import { uploadPart } from './part-upload';
import { finishFull } from './seal';

export interface RunSummary {
  kind: RunPlan['kind'];
  label: string;
  parts: number;
  objects: number;
  skipped: number;
  rawBytes: number;
  compressedBytes: number;
  /** Objects left for the next night (the run's byte cap). */
  left: number;
  sealed: boolean;
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

type PartDone = Awaited<ReturnType<typeof onePart>>;
const added = (sum: RunSummary, r: PartDone): RunSummary => ({
  ...sum,
  parts: sum.parts + 1,
  objects: sum.objects + r.entries.length,
  skipped: sum.skipped + r.skipped.length,
  rawBytes: sum.rawBytes + r.rawBytes,
  compressedBytes: sum.compressedBytes + r.compressedBytes,
});

interface OnePart {
  deps: RunDeps;
  folderId: string;
  now: Date;
}

/** One archive file: its row first (uploading), then the upload, then done (or failed + thrown). */
async function onePart(ctx: OnePart, plan: RunPlan & { part: number }, objects: ListedObject[]) {
  const { deps, folderId, now } = ctx;
  const name = archiveName(plan);
  const id = await deps.store.start({
    folderId,
    kind: plan.kind,
    label: plan.label,
    part: plan.part,
    name,
  });
  const appProperties = archiveProps(plan, dayLabel(now));
  const meta = { ...appProperties, name };
  try {
    const target = { name, parentId: folderId, appProperties };
    const wait = deps.wait ? { wait: deps.wait } : {};
    const part = { source: deps.source, objects, meta, now };
    const r = await uploadPart({ api: deps.api, target, part, ...wait });
    const { entries, rawBytes, skipped } = r.report;
    const done = { id, fileId: r.fileId, rawBytes, compressedBytes: r.compressedBytes, entries };
    await deps.store.finish({ ...done, skipped: skipped.length });
    return { id, fileId: r.fileId, ...r.report, compressedBytes: r.compressedBytes };
  } catch (e) {
    await deps.store.fail({ id, error: errorText(e) });
    throw e;
  }
}

/** A failed part of one big streamed object skips that object (retried next night); else stop. */
async function partOrSkip(ctx: OnePart, plan: RunPlan & { part: number }, objects: ListedObject[]) {
  try {
    return await onePart(ctx, plan, objects);
  } catch (e) {
    const google = ['auth', 'config'].includes(classify(e));
    if (google || !isSolo(objects)) throw e;
    return null;
  }
}

/**
 * One night (docs/45 §5): decide the archive, list what is new or changed against the base, upload
 * it in parts (a failed part stops the run, but for one big object's), then seal a complete full
 * and apply retention.
 */
export async function runBackup(deps: RunDeps, input: { folderId: string; now: Date }) {
  await deps.store.abandon(input.folderId);
  const plan = decide(await deps.store.archives(input.folderId), input.now);
  const todo = await pending(deps, await deps.store.covered(plan.base));
  const { parts, left } = planParts(todo, deps.caps);
  const zero = { parts: 0, objects: 0, skipped: 0, rawBytes: 0, compressedBytes: 0, trashed: 0 };
  let sum: RunSummary = { kind: plan.kind, label: plan.label, left, sealed: false, ...zero };
  for (const [i, objects] of workOf(plan, parts).entries()) {
    const r = await partOrSkip({ ...input, deps }, { ...plan, part: plan.firstPart + i }, objects);
    sum = r ? added(sum, r) : { ...sum, skipped: sum.skipped + 1 };
  }
  const sealable = plan.kind === 'full' && left === 0;
  return sealable ? { ...sum, ...(await finishFull(deps, { ...input, plan })) } : sum;
}
