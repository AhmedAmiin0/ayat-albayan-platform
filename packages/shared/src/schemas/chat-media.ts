import { INVOICE_MAX_BYTES, INVOICE_MIMES } from '../schedule/schemas/index.js';

// What a chat bubble may open (owner 2026-10-19 #1): images/PDFs as before, plus the voice notes
// and videos families send. WhatsApp's own audio/video limit is 16 MB (migration 500's bucket cap).

export const PLAYABLE_MIMES = [
  'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/amr', 'video/mp4', 'video/3gpp',
] as const;
export const PLAYABLE_MAX_BYTES = 16 * 1024 * 1024;

/** What a chat bubble may open: images/PDF (INVOICE_MIMES) + audio/video. */
export const CHAT_VIEW_MIMES = [...INVOICE_MIMES, ...PLAYABLE_MIMES] as const;

/** «audio/ogg; codecs=opus» → «audio/ogg». */
export const baseMime = (mime: string | null): string => mime?.split(';')[0]?.trim().toLowerCase() ?? '';

const inList = (list: readonly string[], mime: string | null): boolean => list.includes(baseMime(mime));

export const isChatViewMime = (mime: string | null): boolean => inList(CHAT_VIEW_MIMES, mime);
export const isPlayableMime = (mime: string | null): boolean => inList(PLAYABLE_MIMES, mime);

/** The cache cap of an inbound chat file: 16 MB for audio/video, 10 MB for images and PDFs. */
export const chatFileMaxBytes = (mime: string | null): number =>
  isPlayableMime(mime) ? PLAYABLE_MAX_BYTES : INVOICE_MAX_BYTES;
