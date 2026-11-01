import { z } from 'zod';
import { baseMime, lenientLabel, parseOrNull } from '@ab/shared';
import type { MediaMessage } from '@/modules/messaging/whatsapp/messages/inbound-media.repo';

// The files the chat pickers offer (the booking's «من الشات», the sales «اختر صورة الإيصال من
// المحادثة»; owner 2026-10-31: stickers filled the list and the PDF never showed): a photo or a PDF
// the family sent, never a sticker (WhatsApp sends one as image/webp) or a voice note. receiptMime
// (one message) and RECEIPT_FILTERS (the query, before its limit) say the same: keep them in step.

const PHOTOS: readonly string[] = ['image/jpeg', 'image/png', 'image/heic'];
const WEBP = 'image/webp';
const PDF = 'application/pdf';
const OCTET = 'application/octet-stream';
/** A webp is a sticker unless Meta named it a photo or a file (an imported row has no type). */
const WEBP_TYPES: readonly string[] = ['image', 'document'];
const PDF_NAME = /\.pdf$/i;

type PickRow = Pick<MediaMessage, 'media_mime' | 'media_name' | 'interactive_payload'>;

const text = (v: string | null | undefined): string | null => (v?.trim() ? v : null);

/** The stored payload's type and a document's file name, when they are non-blank strings. */
const pickPayload = z.looseObject({
  type: lenientLabel,
  document: z.looseObject({ filename: lenientLabel }).catch({}),
});
const payloadType = (p: unknown): string | null => parseOrNull(pickPayload, p)?.type ?? null;
const docName = (p: unknown): string | null =>
  parseOrNull(pickPayload, p)?.document.filename ?? null;

/** The file's name: ours (media_name, an imported document's) or the one Meta sent with it. */
export const receiptName = (row: PickRow): string | null =>
  text(row.media_name) ?? docName(row.interactive_payload);

/** An octet-stream or mime-less file named «….pdf». */
function namedPdf(row: PickRow): boolean {
  if (row.media_mime !== null && baseMime(row.media_mime) !== OCTET) return false;
  const names = [row.media_name, docName(row.interactive_payload)];
  return names.some((n) => typeof n === 'string' && PDF_NAME.test(n));
}

/** The mime a candidate is served as (a named PDF as application/pdf); null = not a candidate. */
export function receiptMime(row: PickRow): string | null {
  const type = payloadType(row.interactive_payload);
  const mime = baseMime(row.media_mime);
  if (type === 'sticker') return null;
  if (PHOTOS.includes(mime) || mime === PDF) return mime;
  if (mime === WEBP) return type !== null && WEBP_TYPES.includes(type) ? mime : null;
  return namedPdf(row) ? PDF : null;
}

/** Exactly that base type, bare or with parameters («; name=…»), as PLAYABLE_FILTER. */
const exact = (m: string): string[] => [`media_mime.ilike.${m}`, `media_mime.ilike.${m};*`];
const anyOf = (parts: readonly string[]): string => `or(${parts.join(',')})`;
const PDF_NAMES = ['media_name.ilike.*.pdf', 'interactive_payload->document->>filename.ilike.*.pdf'];

/** PostgREST `or` filters, ANDed by the query (InboundMediaQueries.receipts). */
export const RECEIPT_FILTERS = {
  /** A stored copy or Meta's media id: an imported row with neither (not copied yet) stays out. */
  source: 'media_id.not.is.null,media_path.not.is.null',
  /** No payload (an imported row) or any type but a sticker: `neq` alone drops a null type. */
  notSticker: 'interactive_payload->>type.is.null,interactive_payload->>type.neq.sticker',
  kind: [
    ...[...PHOTOS, PDF].flatMap(exact),
    `and(${anyOf(exact(WEBP))},interactive_payload->>type.in.(${WEBP_TYPES.join(',')}))`,
    `and(${anyOf(['media_mime.is.null', ...exact(OCTET)])},${anyOf(PDF_NAMES)})`,
  ].join(','),
} as const;
