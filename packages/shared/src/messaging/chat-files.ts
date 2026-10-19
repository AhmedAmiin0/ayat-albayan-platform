import { baseMime } from '../schemas/chat-media.js';

// Files staff send from the chat (owner 2026-10-19 #2): by link, inside the 24 h window.

/** Meta's `image` message takes JPEG/PNG only (no WebP/HEIC); PDFs go as a `document`. */
export const CHAT_SEND_MIMES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export type ChatSendMime = (typeof CHAT_SEND_MIMES)[number];
/** Meta's image limit. */
export const WA_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
/** Meta's media caption limit. */
export const WA_CAPTION_MAX = 1024;

export type WaMediaKind = 'image' | 'document';

/** The Meta message type a sent file travels as: a PDF is a document, an image an image. */
export const waMediaKind = (mime: string | null): WaMediaKind =>
  baseMime(mime).startsWith('image/') ? 'image' : 'document';

export type ChatFileProblem = 'file_type' | 'file_too_large';

/**
 * Why a file cannot be sent, or null. `maxBytes` is the academy's upload limit
 * (uploadMaxBytes(settings), 10 MB by default); an image also stays within Meta's 5 MB.
 */
export function chatFileProblem(f: { mime: string; size: number; maxBytes: number }): ChatFileProblem | null {
  const mime = baseMime(f.mime);
  if (!(CHAT_SEND_MIMES as readonly string[]).includes(mime)) return 'file_type';
  const cap = waMediaKind(mime) === 'image' ? Math.min(WA_IMAGE_MAX_BYTES, f.maxBytes) : f.maxBytes;
  return f.size < 1 || f.size > cap ? 'file_too_large' : null;
}
