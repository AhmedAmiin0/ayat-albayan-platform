import { BUCKETS, type Bucket } from '@/common/storage/storage.paths';

// Every database column that stores a Storage path (docs/45 §6, owner 2026-11-07: «move all the
// old files in minio to be served»). columns.test.ts reads every migration: a *_path column that
// is in neither list below fails it, so a new column cannot be missed silently.

export interface PathColumn {
  table: string;
  column: string;
  bucket: Bucket;
  /** Moved only when named with --table (big objects on the shared disk: docs/45 §7). */
  explicitOnly?: true;
}

/** The columns the move rewrites to «minio:<key>»; every table here has a uuid `id`. */
export const MOVED_COLUMNS: readonly PathColumn[] = [
  { table: 'lesson_reports', column: 'pdf_path', bucket: BUCKETS.reports },
  { table: 'report_attachments', column: 'storage_path', bucket: BUCKETS.attachments },
  { table: 'payments', column: 'receipt_path', bucket: BUCKETS.receipts },
  { table: 'payment_attachments', column: 'path', bucket: BUCKETS.receipts },
  { table: 'expenses', column: 'receipt_path', bucket: BUCKETS.receipts },
  { table: 'teacher_payments', column: 'receipt_path', bucket: BUCKETS.receipts },
  { table: 'teacher_payouts', column: 'receipt_path', bucket: BUCKETS.receipts },
  { table: 'assistant_statements', column: 'receipt_path', bucket: BUCKETS.receipts },
  { table: 'invoices', column: 'storage_path', bucket: BUCKETS.invoices },
  { table: 'saved_replies', column: 'attachment_path', bucket: BUCKETS.waMedia },
  { table: 'messages', column: 'media_path', bucket: BUCKETS.waMedia },
  { table: 'profiles', column: 'avatar_path', bucket: BUCKETS.avatars },
  { table: 'teachers', column: 'avatar_path', bucket: BUCKETS.avatars },
  {
    table: 'lesson_recordings',
    column: 'file_path',
    bucket: BUCKETS.recordings,
    explicitOnly: true,
  },
];

/** Columns and fields that hold a path but are deliberately left as they are, and why. */
export const NOT_MOVED: readonly { at: string; why: string }[] = [
  {
    at: 'import_items.target_path',
    why: 'tools/migrate bookkeeping of what it imported; never served',
  },
  {
    at: 'messages.template_params->document->path',
    why: 'the report PDF a queued template carries: send history; still served from Supabase',
  },
  { at: 'audit_log.before / after, activity_log.meta', why: 'history, never rewritten' },
  {
    at: 'wa-media pdf/{message_id}/{page}.jpg',
    why: 'derived page previews (no column): rendered again into the active store on demand',
  },
];

/** The table names --table accepts. */
export const MOVED_TABLES = MOVED_COLUMNS.map((c) => c.table);

/** What one run moves: the named table, or every column except the explicit-only ones. */
export function columnsFor(table: string | undefined): PathColumn[] {
  const named = (c: PathColumn): boolean => c.table === table;
  const byDefault = (c: PathColumn): boolean => c.explicitOnly !== true;
  return MOVED_COLUMNS.filter(table === undefined ? byDefault : named);
}
