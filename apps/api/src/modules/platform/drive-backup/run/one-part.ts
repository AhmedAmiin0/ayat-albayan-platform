import { classify, errorText } from '@/modules/platform/google-sync';
import type { ArchiveStatus, RunPlan } from '@/modules/platform/drive-backup/plan/archive.types';
import { archiveName, archiveProps, dayLabel } from '@/modules/platform/drive-backup/plan/labels';
import { isSolo } from '@/modules/platform/drive-backup/plan/parts';
import type { ListedObject } from '@/modules/platform/drive-backup/source/backup-source.port';
import type { RunDeps } from './backup-store.port';
import { uploadPart } from './part-upload';
import { isStorageFull } from './quota';

interface OnePart {
  deps: RunDeps;
  folderId: string;
  now: Date;
}
type PartPlan = RunPlan & { part: number };
/** How far a part got: its row, then its Drive file the moment Drive answers with it. */
interface Reached {
  id: string | null;
  fileId: string | null;
}

/**
 * The row first (uploading; its id goes on the file as `ab_row`, so a file whose id is lost is
 * still found: seal.ts), then the upload, the Drive file id at once, then done.
 */
async function upload(
  ctx: OnePart,
  part: { plan: PartPlan; objects: ListedObject[] },
  at: Reached,
) {
  const { deps, folderId, now } = ctx;
  const { plan, objects } = part;
  const name = archiveName(plan);
  const id = await deps.store.start({
    folderId,
    kind: plan.kind,
    label: plan.label,
    part: plan.part,
    name,
  });
  at.id = id;
  const appProperties = { ...archiveProps(plan, dayLabel(now)), ab_row: id };
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
  const done = { id, fileId: r.fileId, rawBytes, compressedBytes: r.compressedBytes, entries };
  await deps.store.finish({ ...done, skipped: skipped.length });
  return { id, fileId: r.fileId, ...r.report, compressedBytes: r.compressedBytes };
}
export type PartDone = Awaited<ReturnType<typeof upload>>;

/** Deletes a file this part made (own folder + marker, drive-remove.ts); a failure is left. */
const dropFile = (ctx: OnePart, fileId: string): Promise<void> =>
  ctx.deps.api.remove({ fileId, folderId: ctx.folderId }).then(
    () => undefined,
    () => undefined,
  );

/** Rows another run took over (abandon, then maybe its clean-up): the file is no row's now. */
const ABANDONED: readonly (ArchiveStatus | null)[] = ['failed', 'trashed'];

/**
 * fail() did not go through: the row is read again, and the file is deleted only when the row
 * was taken over. A `done` row (finish() committed, its answer lost) keeps its file; a re-read
 * that fails too leaves it as well (the next night's clean-up finds a real orphan: seal.ts).
 */
async function dropIfAbandoned(ctx: OnePart, at: { id: string; fileId: string }) {
  const status = await ctx.deps.store.status(at.id).catch(() => null);
  if (ABANDONED.includes(status)) await dropFile(ctx, at.fileId);
}

/**
 * The row `failed`, with the Drive file id when the file exists (the next run deletes it). When
 * that write fails (the database, or the row is no longer `uploading`), see dropIfAbandoned; a
 * file whose id never came back is found later by its `ab_row` marker.
 */
async function failed(ctx: OnePart, at: Reached, e: unknown): Promise<void> {
  const { id, fileId } = at;
  if (id === null) return;
  const fail = { id, error: errorText(e), ...(fileId !== null && { fileId }) };
  await ctx.deps.store
    .fail(fail)
    .catch(() => (fileId === null ? undefined : dropIfAbandoned(ctx, { id, fileId })));
}

/** What a failure really was: the job's deadline (its reason) once the run is aborted. */
const causeOf = (ctx: OnePart, e: unknown): unknown =>
  ctx.deps.signal?.aborted === true ? ctx.deps.signal.reason : e;

/** One archive file; on any failure (its row start included) the row is failed and kept honest. */
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

/** A failed part of one big streamed object skips that object (retried next night); else stop. */
export async function partOrSkip(ctx: OnePart, plan: PartPlan, objects: ListedObject[]) {
  try {
    return await onePart(ctx, plan, objects);
  } catch (e) {
    if (stopsRun(ctx, e, objects)) throw e;
    return null;
  }
}
