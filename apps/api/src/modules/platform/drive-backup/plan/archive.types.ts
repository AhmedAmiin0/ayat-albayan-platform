// The archive rows the planner reads (table drive_backup_archives, one row per Drive file).

export const ARCHIVE_KINDS = ['incr', 'full'] as const;
export type ArchiveKind = (typeof ARCHIVE_KINDS)[number];
export const ARCHIVE_STATUSES = ['uploading', 'done', 'failed', 'trashed'] as const;
export type ArchiveStatus = (typeof ARCHIVE_STATUSES)[number];

export interface ArchiveRow {
  id: string;
  kind: ArchiveKind;
  /** incr: the day (YYYY-MM-DD); full: the ISO week (YYYY-Www). */
  label: string;
  part: number;
  status: ArchiveStatus;
  /** The last part of a complete full: the base of the incrementals that follow. */
  sealed: boolean;
  started_at: string;
  drive_file_id: string | null;
}

/** One run: its kind and label, the archives already covering objects, the next part. */
export interface RunPlan {
  kind: ArchiveKind;
  label: string;
  base: readonly ArchiveRow[];
  firstPart: number;
}
