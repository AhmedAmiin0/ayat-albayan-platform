import type { Tables } from '@ab/db';
import { waIdToE164 } from '@ab/shared';
import type { NumberPurpose } from '@ab/catalog';
import { crmMediaUrl, type CrmMessage } from '@/modules/messaging/whatsapp';
import type { InboundEvent } from '@/modules/messaging/webhook/webhook.events';

// A queued CRM message.received as the inbound path's event (docs/19 «crm driver»). Pure. A file
// the CRM copied to its public chat-media storage is stored as an imported CRM file is: no Meta
// media id, the body only its link, its mime; the inbox fetches it from crm_media_host.

export type CrmQueueRow = Tables<'crm_inbound_queue'>;

/** Where it arrived: the notifications line (null = single line), in module mode its number. */
export interface InboundPlace {
  line: NumberPurpose | null;
  numberId: string | null;
}

interface CrmInboundInput {
  row: CrmQueueRow;
  contact: { phone?: string | null; name?: string | null };
  /** The CRM's copy of this message (a file's link), null for a text. */
  media: CrmMessage | null;
  place: InboundPlace;
}

/** A link's file extension → its mime (the CRM's API does not name it). */
const MIME_BY_EXT: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  amr: 'audio/amr',
  mp4: 'video/mp4',
  '3gp': 'video/3gpp',
  pdf: 'application/pdf',
};

/** The content type's usual mime when the link names none. */
const MIME_BY_TYPE: Readonly<Record<string, string>> = {
  image: 'image/jpeg',
  sticker: 'image/webp',
  audio: 'audio/ogg',
  voice: 'audio/ogg',
  video: 'video/mp4',
  document: 'application/octet-stream',
};

const extOf = (url: string | null | undefined): string =>
  /\.([a-z0-9]{2,4})$/i.exec(url ?? '')?.[1]?.toLowerCase() ?? '';

/** The file's mime: the CRM's own when it says it, else the link's extension, else its type's. */
export function mediaMimeOf(item: CrmMessage): string | null {
  const said = item.media_type?.trim();
  const byType = MIME_BY_TYPE[item.content_type ?? ''] ?? null;
  return said || (MIME_BY_EXT[extOf(item.media_url)] ?? byType);
}

/** The CRM's stored copy of a file: its link and mime, null when either is missing. */
function fileOf(row: CrmQueueRow, media: CrmMessage) {
  const link = crmMediaUrl(media.media_url ?? null);
  const mime = mediaMimeOf({ ...media, content_type: row.content_type });
  return link && mime ? { body: link.href, mediaMime: mime } : null;
}

/** The body and mime of the row: the CRM link + mime for a stored file, else the text. */
const content = (row: CrmQueueRow, media: CrmMessage | null) =>
  (media && fileOf(row, media)) ?? { body: row.body, mediaMime: null };

/** The event; null when the contact has no phone we can read (nothing to thread it on). */
export function crmInboundEvent(input: CrmInboundInput): InboundEvent | null {
  const { row, contact, media, place } = input;
  const phone = waIdToE164(contact.phone ?? '');
  if (!phone) return null;
  return {
    waMessageId: row.wa_message_id,
    from: phone.slice(1),
    name: contact.name?.trim() || null,
    at: new Date(row.received_at),
    type: row.content_type,
    ...content(row, media),
    replyKey: null,
    replyTo: null,
    mediaId: null,
    payload: null,
    line: place.line,
    ...(place.numberId ? { numberId: place.numberId } : {}),
  };
}
