import { baseMime, isChatViewMime } from '@ab/shared';
import { INVOICE_MIMES } from '@ab/schedule';
import { HttpStatus } from '@nestjs/common';
import { httpError } from '@/common/http/errors';
import { isCrmHistoryRow } from '@/modules/messaging/whatsapp/messages/crm-history/crm-history-url';
import type { MediaMessage } from './inbound-media.repo';

/** Meta keeps a media id about 30 days; a day less, so a download never races the deadline. */
export const MEDIA_FETCH_DAYS = 29;
const DAY_MS = 86_400_000;

export const isInvoiceMime = (mime: string | null): boolean =>
  (INVOICE_MIMES as readonly string[]).includes(baseMime(mime));

/** Neither Meta's media id nor an old-CRM link: nothing to fetch it from. */
const noSource = (msg: MediaMessage): boolean => !msg.media_id && !isCrmHistoryRow(msg);
const inboundWithSource = (msg: MediaMessage): boolean =>
  msg.direction === 'inbound' && !noSource(msg);
const inboundFileGone = (msg: MediaMessage): boolean =>
  msg.direction === 'inbound' && !!msg.media_mime && noSource(msg);

/** An inbound file with no id and no link is 410, an honest answer instead of a futile retry. */
export function servable(
  msg: MediaMessage,
  allow: (mime: string | null) => boolean = isInvoiceMime,
): MediaMessage {
  if (inboundFileGone(msg)) throw httpError(HttpStatus.GONE, 'media_expired');
  if (!inboundWithSource(msg) || !allow(msg.media_mime)) {
    throw httpError(HttpStatus.BAD_REQUEST, 'invoice_message');
  }
  return msg;
}

/**
 * W6's gate (a chat bubble, a forward): a family's file (servable with isChatViewMime), or an ECHO,
 * a file the academy phone sent from the WhatsApp Business app (outbound with Meta's media id,
 * docs/19 coexistence). An echo is fetched and cached exactly as an inbound file; an outbound row
 * with neither a stored file nor a media id (imported history) is 410 media_expired.
 */
export function chatServable(msg: MediaMessage): MediaMessage {
  if (msg.direction === 'inbound') return servable(msg, isChatViewMime);
  if (!msg.media_id) throw httpError(HttpStatus.GONE, 'media_expired');
  if (!isChatViewMime(msg.media_mime)) throw httpError(HttpStatus.BAD_REQUEST, 'invoice_message');
  return msg;
}

/** Older than WhatsApp keeps the file (and never cached by us): it cannot be fetched any more. */
export function mediaExpired(
  msg: Pick<MediaMessage, 'created_at' | 'media_path'>,
  now: Date,
): boolean {
  const age = now.getTime() - Date.parse(msg.created_at);
  return msg.media_path === null && age > MEDIA_FETCH_DAYS * DAY_MS;
}
