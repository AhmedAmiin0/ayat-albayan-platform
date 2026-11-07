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

/**
 * One archive file: its row first (uploading), then the upload, the Drive file id at once (so a
 * file whose bookkeeping fails later is still known and removed: seal.ts), then done; or failed.
 */
async function onePart(ctx: OnePart, plan: PartPlan, objects: ListedObject[]) {
  const { deps, folderId, now } = ctx;
  const name = archiveName(plan);
  const row = { folderId, kind: plan.kind, label: plan.label, part: plan.part, name };
  const id = await deps.store.start(row);
  const appProperties = archiveProps(plan, dayLabel(now));
  try {
    const target = { name, parentId: folderId, appProperties };
    const wait = deps.wait && { wait: deps.wait };
    const extra = { ...wait, ...(deps.signal && { signal: deps.signal }) };
    const part = { source: deps.source, objects, meta: { ...appProperties, name }, now };
    const r = await uploadPart({ api: deps.api, target, part, ...extra });
    await deps.store.uploaded({ id, fileId: r.fileId });
    const { entries, rawBytes, skipped } = r.report;
    const done = { id, fileId: r.fileId, rawBytes, compressedBytes: r.compressedBytes, entries };
    await deps.store.finish({ ...done, skipped: skipped.length });
    return { id, fileId: r.fileId, ...r.report, compressedBytes: r.compressedBytes };
  } catch (e) {
    await deps.store.fail({ id, error: errorText(e) });
    throw e;
  }
}
export type PartDone = Awaited<ReturnType<typeof onePart>>;

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
