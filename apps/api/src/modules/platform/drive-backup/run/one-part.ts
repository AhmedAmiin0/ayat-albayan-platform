import { classify, errorText } from '@/modules/platform/google-sync';
import type { RunPlan } from '@/modules/platform/drive-backup/plan/archive.types';
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

/**
 * The row `failed`, with the Drive file id when the file exists (the next run deletes it). When
 * that write fails too (the database, or the row is no longer this run's: zero rows updated), the
 * file is deleted now; one whose id never came back is found later by its `ab_row` marker.
 */
async function failed(ctx: OnePart, at: Reached, e: unknown): Promise<void> {
  const { id, fileId } = at;
  if (id === null) return;
  const fail = { id, error: errorText(e), ...(fileId !== null && { fileId }) };
  await ctx.deps.store
    .fail(fail)
    .catch(() => (fileId === null ? undefined : dropFile(ctx, fileId)));
}

/** One archive file; on any failure (its row start included) the row is failed and kept honest. */
async function onePart(ctx: OnePart, plan: PartPlan, objects: ListedObject[]) {
  const at: Reached = { id: null, fileId: null };
  try {
    return await upload(ctx, { plan, objects }, at);
  } catch (e) {
    await failed(ctx, at, e);
    throw e;
  }
}

/** The Google connection refused, or Drive is full: no later part can succeed either. */
const fatalForRun = (e: unknown): boolean =>
  ['auth', 'config'].includes(classify(e)) || isStorageFull(e);

/** A failed part of one big streamed object skips that object (retried next night); else stop. */
export async function partOrSkip(ctx: OnePart, plan: PartPlan, objects: ListedObject[]) {
  try {
    return await onePart(ctx, plan, objects);
  } catch (e) {
    if (fatalForRun(e) || !isSolo(objects)) throw e;
    return null;
  }
}
