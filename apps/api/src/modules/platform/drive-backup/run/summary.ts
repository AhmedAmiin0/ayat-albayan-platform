import type { RunPlan } from '@/modules/platform/drive-backup/plan/archive.types';
import type { PartDone } from './one-part';
import type { SkipReason } from './part-stream';

export interface RunSummary {
  kind: RunPlan['kind'];
  label: string;
  parts: number;
  objects: number;
  skipped: number;
  /** Skipped objects that still exist (a failed read, a new version): their full stays open. */
  unread: number;
  /** `bucket/key` of the objects larger than tonight's room (skipped; named in the alert). */
  tooLarge: string[];
  rawBytes: number;
  compressedBytes: number;
  /** `bucket/key` of the objects left for the next night (the run's cap, or no room). */
  left: string[];
  sealed: boolean;
  /** Archives deleted from Drive: failed parts, retention, early retirement. */
  trashed: number;
}

export const emptySummary = (plan: Pick<RunPlan, 'kind' | 'label'>): RunSummary => ({
  kind: plan.kind,
  label: plan.label,
  parts: 0,
  objects: 0,
  skipped: 0,
  unread: 0,
  tooLarge: [],
  rawBytes: 0,
  compressedBytes: 0,
  left: [],
  sealed: false,
  trashed: 0,
});

/** Reasons that leave an object that still exists out of the archive. */
const STILL_THERE: readonly SkipReason[] = ['read_failed', 'changed'];

export const added = (sum: RunSummary, r: PartDone): RunSummary => ({
  ...sum,
  parts: sum.parts + 1,
  objects: sum.objects + r.entries.length,
  skipped: sum.skipped + r.skipped.length,
  unread: sum.unread + r.skipped.filter((s) => STILL_THERE.includes(s.reason)).length,
  rawBytes: sum.rawBytes + r.rawBytes,
  compressedBytes: sum.compressedBytes + r.compressedBytes,
});

/** One big object whose own part failed: skipped, and still to be read. */
export const soloFailed = (sum: RunSummary): RunSummary => ({
  ...sum,
  skipped: sum.skipped + 1,
  unread: sum.unread + 1,
});

/**
 * A full is sealed only when it holds every object: nothing left for the next night, nothing too
 * large for the room and no object skipped while it still exists (a vanished one is fine).
 * Otherwise it stays open and the next night continues it, so the restore never takes a full that
 * lacks an object it should hold (one open too long is reported as frozen: plan/frozen.ts).
 */
export const sealable = (plan: Pick<RunPlan, 'kind'>, sum: RunSummary): boolean =>
  plan.kind === 'full' && sum.left.length === 0 && sum.unread === 0 && sum.tooLarge.length === 0;
