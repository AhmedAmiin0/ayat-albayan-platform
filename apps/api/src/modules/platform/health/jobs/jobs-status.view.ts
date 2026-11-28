import type { JobBeat, JobStatus } from '@ab/shared';
import { isStale } from '@/common/jobs/beats';

const iso = (ms: number | null): string | null => (ms === null ? null : new Date(ms).toISOString());

const row = (now: number) => (b: JobBeat): JobStatus => ({
  name: b.name,
  every_ms: b.everyMs,
  last_ok_at: iso(b.lastOkAt),
  last_error_at: iso(b.lastErrorAt),
  last_error: b.lastError,
  stale: isStale(b, now),
});

/** Stale jobs first, then by name. */
const order = (a: JobStatus, b: JobStatus): number =>
  Number(b.stale) - Number(a.stale) || a.name.localeCompare(b.name);

export const jobStatusRows = (beats: readonly JobBeat[], now: number): JobStatus[] =>
  beats.map(row(now)).sort(order);
