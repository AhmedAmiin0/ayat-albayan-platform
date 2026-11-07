// The archive rows (table drive_backup_archives, one row per Drive file; add-only, docs/45 §5).

export const ARCHIVE_STATUSES = ['uploading', 'done', 'failed'] as const;

/** One archive part: the night's UTC day and its part number (a new one for every try). */
export interface PartPlan {
  label: string;
  part: number;
}
