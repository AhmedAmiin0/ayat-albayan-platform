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
  /** Profile photos (migration 20261012000370, R-ACC-05). */
  avatars: 'avatars',
} as const;
export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

/**
 * Signed download lifetimes: the UI opens a file now; WhatsApp fetches a document later; the family
 * portal signs one file per tap and opens it at once (docs/31), so its link dies within minutes.
 */
export const SIGNED_URL_SECONDS = { ui: 3600, whatsapp: 7 * 24 * 3600, portal: 300 } as const;

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
  'audio/amr': 'amr',
  'video/mp4': 'mp4',
  'video/3gpp': '3gp',
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

/** avatars/teachers/{teacher_id}/avatar-{ms}.{ext}: an admin's photo of a teacher who may have no login (migration 20261028000944). */
export function teacherAvatarPath(input: { teacherId: string; mime: string; now?: number }): string {
  return `teachers/${input.teacherId}/avatar-${input.now ?? Date.now()}.${extFor(input.mime)}`;
}

/** Was `path` signed for this user's photo? Exactly {user_id}/avatar-{file}. */
export function isUserAvatarPathOf(path: string, userId: string): boolean {
  return isPathOf(path, userId) && path.startsWith(`${userId}/avatar-`);
}

/** Was `path` signed for this teacher record's photo? Exactly teachers/{teacher_id}/avatar-{file}. */
export function isTeacherAvatarPathOf(path: string, teacherId: string): boolean {
  const parts = path.split('/');
  return parts.length === 3 && parts[0] === 'teachers' && isUserAvatarPathOf(parts.slice(1).join('/'), teacherId);
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

/** wa-media/out/{actor}/{client_request_id}/{uuid}.{ext}: a file staff send from the chat (owner 2026-10-19 #2). */
export function chatOutPath(input: { actorId: string; requestId: string; mime: string }): string {
  return `out/${input.actorId}/${input.requestId}/${uploadName(input.mime)}`;
}

/** wa-media/out/{actor}/{client_request_id}/fwd-{message_id}.{ext}: our copy of a forwarded file, one per forward. */
export function forwardOutPath(input: { actorId: string; requestId: string; messageId: string; mime: string }): string {
  return `out/${input.actorId}/${input.requestId}/fwd-${input.messageId}.${extFor(input.mime)}`;
}

/** Was `path` signed for this actor and request? Exactly out/{actor}/{request}/{file}. */
export function isChatOutPathOf(path: string, owner: { actorId: string; requestId: string }): boolean {
  const parts = path.split('/');
  const [out, actor, request, file] = parts;
  return parts.length === 4 && out === 'out' && actor === owner.actorId && request === owner.requestId
    && file !== undefined && file.length > 0 && file !== '..' && file !== '.';
}

/** Does `path` belong to `owner` (a report id or a subscription id)? Guards a client-sent path. */
export function isPathOf(path: string, owner: string): boolean {
  const [head, file, ...rest] = path.split('/');
  return head === owner && file !== undefined && file.length > 0 && rest.length === 0;
}
