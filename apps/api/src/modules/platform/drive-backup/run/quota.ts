import { GoogleApiError } from '@/modules/platform/google-sync';
import type { DriveQuota } from '@/modules/platform/drive-backup/drive/drive-backup.port';

const GB = 1024 ** 3;
/**
 * Never used by the backup (a free Gmail account has 15 GB shared with Gmail, the Google sync's
 * report PDFs and Sheets): no part is uploaded that would eat into it. A night's budget is above.
 */
export const RESERVE_BYTES = 2 * GB;

/** Bytes left; null: no limit. */
export const freeOf = (q: Pick<DriveQuota, 'limit' | 'usage'>): number | null =>
  q.limit === null ? null : Math.max(0, q.limit - q.usage);

/** What a night may still put on Drive: free minus the reserve; Infinity without a limit. */
export const budgetOf = (free: number | null): number =>
  free === null ? Number.POSITIVE_INFINITY : free - RESERVE_BYTES;

export const isLow = (free: number | null): boolean => free !== null && free < RESERVE_BYTES;

const MB = 1024 ** 2;

/** «1.4 GB» from a gigabyte up, «3.2 MB» below: the alert's figure (one decimal). */
export const sizeText = (bytes: number): string =>
  bytes >= GB ? `${(bytes / GB).toFixed(1)} GB` : `${(bytes / MB).toFixed(1)} MB`;

/** Drive refused the upload for space: the night stops (never «skip this object»). */
export const isStorageFull = (e: unknown): boolean =>
  e instanceof GoogleApiError && e.reason === 'storageQuotaExceeded';
