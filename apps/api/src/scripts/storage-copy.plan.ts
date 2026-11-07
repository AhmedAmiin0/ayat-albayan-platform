import type { Bucket } from '@/common/storage/storage.paths';
import {
  ObjectExists,
  type ObjectStore,
  type PutObject,
} from '@/common/storage/store/object-store';

// The later bulk copy (docs/45 «Bulk copy»): every Supabase object into MinIO under the same key.
// Dry-run unless `apply`; idempotent: an object MinIO already holds is never touched.
// Objects only: the stored paths keep pointing at Supabase until a later change marks them.

export interface CopyPlan {
  from: ObjectStore;
  to: ObjectStore;
  buckets: readonly Bucket[];
  apply: boolean;
}

export interface BucketTally {
  bucket: Bucket;
  present: number;
  copied: number;
  /** Dry-run: would be copied. */
  pending: number;
  failed: number;
}

/** Our own probe / health keys are never copied. */
const INTERNAL = /^_(probe|health)\//;

type Outcome = 'present' | 'copied' | 'pending' | 'failed';

async function copyOne(plan: CopyPlan, o: { bucket: Bucket; key: string }): Promise<Outcome> {
  const [src, dst] = await Promise.all([plan.from.info(o), plan.to.info(o)]);
  if (!src) return 'failed';
  // Never overwrite: MinIO may hold a NEWER object under the same key (a report re-rendered after
  // the switch); an old copy must not replace it.
  if (dst) return 'present';
  if (!plan.apply) return 'pending';
  const body = await plan.from.get(o);
  if (!body) return 'failed';
  return putAbsent(plan.to, { ...o, body, contentType: src.contentType });
}

/**
 * Puts a copy unless the key is taken. The app may write the same key at any moment; the newer
 * object wins (If-None-Match: *, 412 → ObjectExists → present), never the stale copy.
 * Shared with the move (storage-move/, docs/45 §6).
 */
export function putAbsent(to: ObjectStore, o: PutObject): Promise<'copied' | 'present'> {
  return to.put({ ...o, ifAbsent: true }).then(
    () => 'copied' as const,
    (e: unknown) => keptOrThrow(e),
  );
}

const keptOrThrow = (e: unknown): 'present' => {
  if (e instanceof ObjectExists) return 'present';
  throw e;
};

/** A key taken while copying is «present»; any other failure is «failed». */
const outcomeOf = (e: unknown): Outcome => (e instanceof ObjectExists ? 'present' : 'failed');

const safely = (plan: CopyPlan, o: { bucket: Bucket; key: string }): Promise<Outcome> =>
  copyOne(plan, o).catch(outcomeOf);

/** One bucket after the other, one object at a time (a small VPS; the copy may run for hours). */
export async function copyToMinio(plan: CopyPlan): Promise<BucketTally[]> {
  const out: BucketTally[] = [];
  for (const bucket of plan.buckets) {
    const tally: BucketTally = { bucket, present: 0, copied: 0, pending: 0, failed: 0 };
    const keys = (await plan.from.list({ bucket, prefix: '' })).filter((k) => !INTERNAL.test(k));
    for (const key of keys) tally[await safely(plan, { bucket, key })] += 1;
    out.push(tally);
  }
  return out;
}

/** One line per bucket: counts only, never a key. */
export const tallyLine = (t: BucketTally): string =>
  `${t.bucket}: ${t.present} already in MinIO, ${t.copied} copied, ${t.pending} to copy, ${t.failed} failed`;
