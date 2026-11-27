import { skipWhySchema, type BackupSkippedItem, type SkipWhy } from '@ab/shared';
import { objectId } from '@/modules/platform/drive-backup/plan/parts';
import type { ListedObject } from '@/modules/platform/drive-backup/source/backup-source.port';
import type { PartDone } from './one-part';
import { z } from 'zod';
import { skipReasonSchema } from './skip.schemas';

export interface RunSummary {
  label: string;
  parts: number;
  objects: number;
  rawBytes: number;
  compressedBytes: number;
  skipped: BackupSkippedItem[];
  /** Objects not sent tonight: Drive's free space above the 2 GB reserve was too small. */
  waiting: number;
}

export const emptySummary = (label: string): RunSummary => ({
  label,
  parts: 0,
  objects: 0,
  rawBytes: 0,
  compressedBytes: 0,
  skipped: [],
  waiting: 0,
});

const item = (
  o: { bucket: string; key: string; size: number },
  reason: SkipWhy,
): BackupSkippedItem => ({
  id: objectId(o),
  size: o.size,
  reason,
});

export const tooLargeItems = (list: readonly ListedObject[]): BackupSkippedItem[] =>
  list.map((o) => item(o, 'too_large'));

/** What a skip inside a part means for the admins: a vanished object is not named (it is gone). */
const NAMED = z.record(skipReasonSchema, skipWhySchema.nullable()).readonly().decode({
  missing: null,
  read_failed: 'read_failed',
  changed: 'changed',
});

export const added = (sum: RunSummary, r: PartDone): RunSummary => ({
  ...sum,
  parts: sum.parts + 1,
  objects: sum.objects + r.entries.length,
  rawBytes: sum.rawBytes + r.rawBytes,
  compressedBytes: sum.compressedBytes + r.compressedBytes,
  skipped: [
    ...sum.skipped,
    ...r.skipped.flatMap((s) => {
      const why = NAMED[s.reason];
      return why === null ? [] : [item(s, why)];
    }),
  ],
});

/** One big object whose own part failed: skipped tonight, named with why, retried next night. */
export const soloFailed = (
  sum: RunSummary,
  failed: { objects: readonly ListedObject[]; why: SkipWhy },
): RunSummary => ({
  ...sum,
  skipped: [...sum.skipped, ...failed.objects.map((o) => item(o, failed.why))],
});

/** A part that did not fit Drive's room: its objects wait for a later night. */
export const waited = (sum: RunSummary, objects: readonly ListedObject[]): RunSummary => ({
  ...sum,
  waiting: sum.waiting + objects.length,
});
