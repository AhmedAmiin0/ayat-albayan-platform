import { isPdfMime } from '@ab/shared';
import type { SharedFile, SharedItems } from './read-share';

// docs/38 §mobile 5: what a share may carry, checked before anything is read or sent. The server
// stays the authority (chatFileProblem, the window, files_forbidden); this only refuses early.

/** At most this many files in one share (owner: «max 10 files»). */
export const SHARE_MAX_FILES = 10;

export type ShareProblem = 'empty' | 'too_many' | 'teacher_files' | 'file_type' | 'file_too_large';

interface ShareCheck {
  items: SharedItems;
  /** A teacher shares text and links only (owner #5: 403 files_forbidden). */
  teacher: boolean;
  /** useUploadMaxBytes: a PDF over it is refused before it is read. */
  maxBytes: number;
}

const isImage = (f: SharedFile): boolean => f.mime.startsWith('image/');
const shareable = (f: SharedFile): boolean => isImage(f) || isPdfMime(f.mime);
const pdfTooLarge = (f: SharedFile, maxBytes: number): boolean =>
  isPdfMime(f.mime) && f.size !== null && f.size > maxBytes;

/** In order: the first broken rule names the problem. Images are re-encoded, so no size check. */
const RULES: readonly (readonly [ShareProblem, (c: ShareCheck) => boolean])[] = [
  ['empty', ({ items }) => items.text.trim() === '' && items.files.length === 0],
  ['too_many', ({ items }) => items.files.length > SHARE_MAX_FILES],
  ['teacher_files', ({ items, teacher }) => teacher && items.files.length > 0],
  ['file_type', ({ items }) => !items.files.every(shareable)],
  ['file_too_large', ({ items, maxBytes }) => items.files.some((f) => pdfTooLarge(f, maxBytes))],
];

/** null when the share may go to a chat; otherwise the reason it may not. */
export function shareProblem(check: ShareCheck): ShareProblem | null {
  return RULES.find(([, broken]) => broken(check))?.[0] ?? null;
}

/** The file's kind for the send: a photo is re-encoded, a PDF goes as is. */
export function sharedKind(f: SharedFile): 'image' | 'pdf' | 'other' {
  const kinds = [['image', isImage(f)], ['pdf', isPdfMime(f.mime)]] as const;
  return kinds.find(([, yes]) => yes)?.[0] ?? 'other';
}
