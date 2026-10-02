import { randomUUID } from 'node:crypto';

// Private buckets and object paths (migration 122). The storage.objects policies parse these
// paths, so build them only here.

export const BUCKETS = {
  reports: 'reports',
  attachments: 'report-attachments',
  receipts: 'receipts',
} as const;
export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

/** Signed download lifetimes: the UI opens a file now; WhatsApp fetches a document later. */
export const SIGNED_URL_SECONDS = { ui: 3600, whatsapp: 7 * 24 * 3600 } as const;

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/wav': 'wav',
};

/** File extension for an accepted mime type; 'bin' for anything else (the bucket rejects it). */
export function extFor(mime: string): string {
  return EXT[mime] ?? 'bin';
}

/** reports/{student_id}/{lesson_id}.pdf (R-REP-03). Re-rendering overwrites the same object. */
export function reportPdfPath(input: { studentId: string; lessonId: string }): string {
  return `${input.studentId}/${input.lessonId}.pdf`;
}

/** report-attachments/{report_id}/{uuid}.{ext}: one object per upload, never overwritten. */
export function attachmentPath(input: { reportId: string; mime: string }): string {
  return `${input.reportId}/${randomUUID()}.${extFor(input.mime)}`;
}

/** receipts/{subscription_id}/{uuid}.{ext} (R-PAY-01, R-MOB-02 camera). */
export function receiptPath(input: { subscriptionId: string; mime: string }): string {
  return `${input.subscriptionId}/${randomUUID()}.${extFor(input.mime)}`;
}

/** Does `path` belong to `owner` (a report id or a subscription id)? Guards a client-sent path. */
export function isPathOf(path: string, owner: string): boolean {
  const [head, file, ...rest] = path.split('/');
  return head === owner && file !== undefined && file.length > 0 && rest.length === 0;
}
