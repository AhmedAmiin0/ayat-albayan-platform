import { counted, type PluralForm } from '../../core/format/index.js';
import type { SignedDownload } from '../../reports/index.js';
import { baseMime } from '../../schemas/chat-media.js';

// Files staff send from the chat (owner 2026-10-19 #2): by link, inside the 24 h window.

/** Meta's `image` message takes JPEG/PNG only (no WebP/HEIC); PDFs go as a `document`. */
export const CHAT_SEND_MIMES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export type ChatSendMime = (typeof CHAT_SEND_MIMES)[number];
/**
 * A voice note recorded in the app (owner 2026-10-27): AAC in MP4, as Android records it; the API
 * turns it into a WhatsApp voice note (ogg/opus). The chat's own send only: saved replies and the
 * web's attach keep CHAT_SEND_MIMES.
 */
export const CHAT_VOICE_MIME = 'audio/mp4';
/** What the chat's file send accepts: an image, a PDF or a recorded voice note. */
export const CHAT_FILE_MIMES = [...CHAT_SEND_MIMES, CHAT_VOICE_MIME] as const;
/** Meta's image limit. */
export const WA_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
/** Meta's media caption limit. */
export const WA_CAPTION_MAX = 1024;

export type WaMediaKind = 'image' | 'document';

/** The Meta message type a sent file travels as: a PDF is a document, an image an image. */
export const waMediaKind = (mime: string | null): WaMediaKind =>
  baseMime(mime).startsWith('image/') ? 'image' : 'document';

/** Meta's session media types by mime (images JPEG/PNG only; WhatsApp's own audio and video formats). */
const SEND_KINDS: Record<string, 'image' | 'audio' | 'video'> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'audio/aac': 'audio',
  'audio/amr': 'audio',
  'audio/mpeg': 'audio',
  'audio/mp4': 'audio',
  'audio/ogg': 'audio',
  'video/mp4': 'video',
  'video/3gpp': 'video',
};
export type WaSendKind = 'image' | 'audio' | 'video' | 'document';

/** The type a stored file travels as (a forwarded voice note or video too); anything else goes as a document. */
export const waSendKind = (mime: string | null): WaSendKind => SEND_KINDS[baseMime(mime)] ?? 'document';

export type ChatFileProblem = 'file_type' | 'file_too_large';

/**
 * Why a file cannot be sent, or null. `maxBytes` is the academy's upload limit
 * (uploadMaxBytes(settings), 10 MB by default); an image also stays within Meta's 5 MB. `mimes` is
 * the accepted list: CHAT_SEND_MIMES unless the caller is the chat's file send (CHAT_FILE_MIMES).
 */
export function chatFileProblem(
  f: { mime: string; size: number; maxBytes: number },
  mimes: readonly string[] = CHAT_SEND_MIMES,
): ChatFileProblem | null {
  const mime = baseMime(f.mime);
  if (!mimes.includes(mime)) return 'file_type';
  const cap = waMediaKind(mime) === 'image' ? Math.min(WA_IMAGE_MAX_BYTES, f.maxBytes) : f.maxBytes;
  return f.size < 1 || f.size > cap ? 'file_too_large' : null;
}

// A PDF bubble like WhatsApp's (owner 2026-10-29): page 1 as a thumb and «12 صفحة · PDF · 1.2 ميغابايت».

const PDF_MIME = 'application/pdf';
export const isPdfMime = (mime: string | null): boolean => baseMime(mime) === PDF_MIME;
/** The preview's last page (GET …/pdf/:page refuses more); the file itself keeps them all. */
export const PDF_PREVIEW_PAGES = 30;

/**
 * GET /threads/:phone/messages/:id/pdf/:page: that page as a signed JPEG (1 h), with the PDF's page
 * count and size. Page 1 is the bubble's thumb and the descriptor.
 */
export type ThreadPdfPage = SignedDownload & { page: number; pages: number; bytes: number };

/** The strings of inbox.pdf (ar.json / en.json) the meta line reads. */
export type PdfMetaStrings = { type: string; pages: Readonly<Record<PluralForm, string>>; kb: string; mb: string };

const MB = 1024 * 1024;
/** First-strong isolate (FSI … PDI): in an Arabic line «1.2» never takes its direction from «PDF» (bidi W7). */
const isolate = (s: string): string => `⁨${s}⁩`;

/** Whole KB below 1 MB (at least 1), else MB with one decimal; Western digits. */
function fileSizeText(bytes: number, s: PdfMetaStrings): string {
  const small = bytes < MB;
  const n = small ? String(Math.max(1, Math.floor(bytes / 1024))) : (bytes / MB).toFixed(1);
  return (small ? s.kb : s.mb).split('{n}').join(n);
}

/** «12 صفحة · PDF · 1.2 ميغابايت», each part isolated so the line reads right in Arabic and English. */
export function pdfMetaLine(doc: { pages: number; bytes: number }, s: PdfMetaStrings): string {
  return [counted(s.pages, doc.pages), s.type, fileSizeText(doc.bytes, s)].map(isolate).join(' · ');
}
