import { randomUUID } from 'node:crypto';

// Private buckets and object paths (migration 122). The storage.objects policies parse these
// paths, so build them only here.

export const BUCKETS = {
  reports: 'reports',
  attachments: 'report-attachments',
  receipts: 'receipts',
  /** The فاتورة of a non-trial booking (migration 170). */
  invoices: 'invoices',
  /** Inbound WhatsApp media downloaded on demand (migration 170). */
  waMedia: 'wa-media',
  /** Lesson recordings, written by the LiveKit egress through the S3 endpoint (migration 189). */
  recordings: 'recordings',
  /** Profile photos (migration 20261012000350, R-ACC-05). */
  avatars: 'avatars',
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

/** receipts/{teacher_id}/{uuid}.{ext}: a payment to a teacher (per-session earnings). */
export function teacherReceiptPath(input: { teacherId: string; mime: string }): string {
  return `${input.teacherId}/${randomUUID()}.${extFor(input.mime)}`;
}

/** avatars/{user_id}/avatar-{ms}.{ext}: a new object per photo, so a cached signed URL never shows a stale one. */
export function avatarPath(input: { userId: string; mime: string; now?: number }): string {
  return `${input.userId}/avatar-${input.now ?? Date.now()}.${extFor(input.mime)}`;
}

/** invoices/{client_request_id}/{name}: the booking's own folder, so a path proves whose it is. */
export function invoicePath(input: { requestId: string; name: string }): string {
  return `${input.requestId}/${input.name}`;
}

/** One object per upload: `{uuid}.{ext}`. */
export function uploadName(mime: string): string {
  return `${randomUUID()}.${extFor(mime)}`;
}

/** Deterministic, so saving the same chat message twice (a retry) lands on the same object. */
export function chatName(messageId: string, mime: string): string {
  return `wa-${messageId}.${extFor(mime)}`;
}

/** wa-media/{message_id}.{ext}: the cache of one inbound message's file. */
export function waMediaPath(input: { messageId: string; mime: string }): string {
  return `${input.messageId}.${extFor(input.mime)}`;
}

/** Does `path` belong to `owner` (a report id or a subscription id)? Guards a client-sent path. */
export function isPathOf(path: string, owner: string): boolean {
  const [head, file, ...rest] = path.split('/');
  return head === owner && file !== undefined && file.length > 0 && rest.length === 0;
}
