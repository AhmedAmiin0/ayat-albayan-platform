import { GoogleApiError } from '@/modules/platform/google-sync';
import type { DriveQuota } from '@/modules/platform/drive-backup/drive/drive-backup.port';

const GB = 1024 ** 3;
/**
 * Never used by the backup (a free Gmail account has 15 GB shared with Gmail, the Google sync's
 * report PDFs and Sheets): under this a warning and no upload. A run's budget is what is above.
 */
export const RESERVE_BYTES = 2 * GB;

/** Bytes left; null: no limit. */
export const freeOf = (q: Pick<DriveQuota, 'limit' | 'usage'>): number | null =>
  q.limit === null ? null : Math.max(0, q.limit - q.usage);

/** What a run may still put on Drive: free minus the reserve; Infinity without a limit. */
export const budgetOf = (free: number | null): number =>
  free === null ? Number.POSITIVE_INFINITY : free - RESERVE_BYTES;

export const isLow = (free: number | null): boolean => free !== null && free < RESERVE_BYTES;

/** «1.4 GB»: the alert's figure (one decimal). */
export const gbText = (bytes: number): string => `${(bytes / GB).toFixed(1)} GB`;

export class DriveFull extends Error {
  constructor() {
    super('drive_full');
  }
}

/** Drive refused the upload for space: the run stops (never «skip this object»). */
export const isStorageFull = (e: unknown): boolean =>
  e instanceof DriveFull || (e instanceof GoogleApiError && e.reason === 'storageQuotaExceeded');
