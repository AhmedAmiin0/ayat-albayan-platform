import type { Json } from '@ab/db';
import { MEDIA_TYPES, type InboundEvent } from '@/modules/messaging/webhook/webhook.events';
import { where, type Receiving } from '@/modules/messaging/webhook/lines/webhook.lines';
import { field, first, get, metaTime } from './webhook.fields';
import { mediaFileName } from './file-name';

/** The type-specific part as Meta sent it (+ errors of an «unsupported» message); null for text. */
function payloadOf(m: unknown, type: string): Json | null {
  if (type === 'text') return null;
  const errors = get(m, 'errors');
  return {
    type,
    [type]: get(m, type) ?? null,
    ...(errors === undefined ? {} : { errors }),
  } as Json;
}

interface MessageContext {
  names: Map<string, string>;
  now: Date;
  at: Receiving;
}

const isMedia = (type: string): boolean => (MEDIA_TYPES as readonly string[]).includes(type);

/** A key of the media part («image.id»); null for a message that carries no media. */
const mediaField = (m: unknown, type: string, key: string): string | null =>
  isMedia(type) ? field(m, `${type}.${key}`) : null;

/** The media id and mime, plus a document's name (Meta's document.filename, Kapso's media_data). */
function mediaPart(
  m: unknown,
  type: string,
): Pick<InboundEvent, 'mediaId' | 'mediaMime' | 'mediaName'> {
  const mf = (key: string) => mediaField(m, type, key);
  const raw = () => first(mf('filename'), field(m, 'kapso.media_data.filename'));
  const fileName = type === 'document' ? mediaFileName(raw()) : null;
  return {
    mediaId: mf('id'),
    mediaMime: mf('mime_type'),
    ...(fileName ? { mediaName: fileName } : {}),
  };
}

/** One Meta message object → an InboundEvent (also Kapso's inbound history, external/inbound). */
export function toInbound(m: unknown, ctx: MessageContext): InboundEvent | null {
  const [from, id, type] = [field(m, 'from'), field(m, 'id'), field(m, 'type')];
  if (!from || !id || !type) return null;
  const f = (path: string) => field(m, path);
  return {
    waMessageId: id,
    from,
    name: ctx.names.get(from) || null,
    at: metaTime(f('timestamp'), ctx.now),
    type,
    body: first(
      f('text.body'),
      mediaField(m, type, 'caption'),
      f('button.text'),
      f('interactive.button_reply.title'),
      f('interactive.list_reply.title'),
    ),
    replyKey: first(
      f('button.payload'),
      f('interactive.button_reply.id'),
      f('interactive.list_reply.id'),
    ),
    replyTo: f('context.id'),
    ...mediaPart(m, type),
    payload: payloadOf(m, type),
    ...where(ctx.at),
  };
}
