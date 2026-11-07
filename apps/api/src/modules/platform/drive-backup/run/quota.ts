import type { DriveQuota } from '@/modules/platform/drive-backup/drive/drive-backup.port';

const GB = 1024 ** 3;
/** Under this a warning (a free Gmail account has 15 GB shared with Gmail and Photos). */
const LOW_QUOTA_BYTES = 2 * GB;
/** Under this no run starts: an upload would fail half way. */
const MIN_FREE_BYTES = GB / 2;

/** Bytes left; null: no limit. */
export const freeOf = (q: Pick<DriveQuota, 'limit' | 'usage'>): number | null =>
  q.limit === null ? null : Math.max(0, q.limit - q.usage);

export const isLow = (free: number | null): boolean => free !== null && free < LOW_QUOTA_BYTES;
export const isFull = (free: number | null): boolean => free !== null && free < MIN_FREE_BYTES;

/** «1.4 GB»: the alert's figure (one decimal). */
export const gbText = (bytes: number): string => `${(bytes / GB).toFixed(1)} GB`;

export class DriveFull extends Error {
  constructor() {
    super('drive_full');
  }
}
