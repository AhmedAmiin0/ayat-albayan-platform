import { classify, errorText } from '@/modules/platform/google-sync';
import type { PartPlan } from '@/modules/platform/drive-backup/plan/archive.types';
import { archiveName, archiveProps } from '@/modules/platform/drive-backup/plan/labels';
import { isSolo } from '@/modules/platform/drive-backup/plan/parts';
import type { ListedObject } from '@/modules/platform/drive-backup/source/backup-source.port';
import type { RunDeps } from './backup-store.port';
import { uploadPart } from './part-upload';
import { isStorageFull } from './quota';
import { soloWhy } from './read-error';
import type { SkipWhy } from './summary';

interface OnePart {
  deps: RunDeps;
  folderId: string;
  now: Date;
}
/** How far a part got: its row, then its Drive file the moment Drive answers with it. */
interface Reached {
  id: string | null;
  fileId: string | null;
}

/**
 * The row first (uploading; its id goes on the file as `ab_row`), then the upload, the Drive
 * file id at once, then the objects and `done`: only then do they count as backed up.
 */
async function upload(
  ctx: OnePart,
  part: { plan: PartPlan; objects: ListedObject[] },
  at: Reached,
) {
  const { deps, folderId, now } = ctx;
  const { plan, objects } = part;
  const name = archiveName(plan);
  const id = await deps.store.start({ folderId, ...plan, name });
  at.id = id;
  const appProperties = { ...archiveProps(plan), ab_row: id };
  const target = { name, parentId: folderId, appProperties };
  const extra = {
    ...(deps.wait && { wait: deps.wait }),
    ...(deps.signal && { signal: deps.signal }),
  };
  const input = { source: deps.source, objects, meta: { ...appProperties, name }, now };
  const onFile = (fileId: string) => {
    at.fileId = fileId;
  };
  const r = await uploadPart({ api: deps.api, target, part: input, onFile, ...extra });
  await deps.store.uploaded({ id, fileId: r.fileId });
  const { entries, rawBytes, skipped } = r.report;
  const done = { id, folderId, fileId: r.fileId, rawBytes, entries };
  await deps.store.finish({ ...done, compressedBytes: r.compressedBytes, skipped: skipped.length });
  return { id, fileId: r.fileId, ...r.report, compressedBytes: r.compressedBytes };
}
export type PartDone = Awaited<ReturnType<typeof upload>>;

/**
 * The row `failed`, with the Drive file id when the file exists. Add-only: the file is never
 * deleted (an orphan the restore tolerates); a failed write is left (the next night abandons it).
 */
async function failed(ctx: OnePart, at: Reached, e: unknown): Promise<void> {
  const { id, fileId } = at;
  if (id === null) return;
  const fail = { id, error: errorText(e), ...(fileId !== null && { fileId }) };
  await ctx.deps.store.fail(fail).catch(() => undefined);
}

/** What a failure really was: the job's deadline (its reason) once the run is aborted. */
const causeOf = (ctx: OnePart, e: unknown): unknown =>
  ctx.deps.signal?.aborted === true ? ctx.deps.signal.reason : e;

/** One archive file; on any failure (its row start included) the row is failed. */
async function onePart(ctx: OnePart, plan: PartPlan, objects: ListedObject[]) {
  const at: Reached = { id: null, fileId: null };
  try {
    return await upload(ctx, { plan, objects }, at);
  } catch (e) {
    const cause = causeOf(ctx, e);
    await failed(ctx, at, cause);
    throw cause;
  }
}

/**
 * No later part can succeed either: the job's deadline, the Google connection refused, or Drive
 * full; and a part of several objects (not one big streamed object).
 */
const stopsRun = (ctx: OnePart, e: unknown, objects: readonly ListedObject[]): boolean =>
  ctx.deps.signal?.aborted === true ||
  ['auth', 'config'].includes(classify(e)) ||
  isStorageFull(e) ||
  !isSolo(objects);

/** A part on Drive, or one big object's own part that failed and why (it is skipped tonight). */
type PartOutcome = { done: PartDone } | { done: null; why: SkipWhy };

/** A failed part of one big streamed object skips that object (retried next night); else stop. */
export async function partOrSkip(
  ctx: OnePart,
  plan: PartPlan,
  objects: ListedObject[],
): Promise<PartOutcome> {
  try {
    return { done: await onePart(ctx, plan, objects) };
  } catch (e) {
    if (stopsRun(ctx, e, objects)) throw e;
    return { done: null, why: soloWhy(e) };
  }
}
