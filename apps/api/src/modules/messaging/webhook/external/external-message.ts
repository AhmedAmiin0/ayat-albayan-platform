import type { Json } from '@ab/db';
import { defaultMediaMime, echoPayload } from '@ab/shared';
import {
  DELIVERY_STATUSES,
  MEDIA_TYPES,
  type DeliveryStatus,
} from '@/modules/messaging/webhook/webhook.events';
import { field, get } from '@/modules/messaging/webhook/parse/webhook.parse';
import { mediaFileName } from '@/modules/messaging/webhook/parse/file-name';

// A message the business sent outside the app, read out of Meta's message object: an
// smb_message_echoes item, or an item of Kapso's message history (the same Meta shape plus a
// `kapso` block). Pure and lenient: anything without an id, a recipient or a timestamp is null.

export interface ExternalMessage {
  waMessageId: string;
  /** The customer's wa_id (digits, no +). */
  to: string;
  /** WhatsApp's own time of the message (never when we stored it). */
  at: Date;
  type: string;
  /** Text or media caption; null for a template or a caption-less media. */
  body: string | null;
  templateName: string | null;
  /** messages.template_params shape: «1», «2», … for the body, «button» for the first button. */
  templateParams: Record<string, string> | null;
  mediaId: string | null;
  mediaMime: string | null;
  mediaName: string | null;
  replyTo: string | null;
  /** Kapso's own status of the message, when it carries one. */
  status: DeliveryStatus | null;
  /** Kapso's direction, when it carries one (history items); echoes have none (always outbound). */
  direction: string | null;
  /** messages.interactive_payload (echoPayload): a marker, the ad's welcome, a media part. */
  payload: Json | null;
}

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const first = (...values: (string | null)[]): string | null => values.find((v) => v !== null) ?? null;

/** Unix seconds (Meta; 13 digits = milliseconds) or an ISO string → Date; null when missing or unreadable. */
export function messageTime(ts: string | null): Date | null {
  if (!ts) return null;
  const digits = /^\d+$/.test(ts) ? Number(ts) : null;
  const at = digits === null ? new Date(ts) : new Date(ts.length >= 13 ? digits : digits * 1000);
  return at.getTime() > 0 ? at : null;
}

/** The text parameters of one template component, in order. */
const texts = (c: unknown): string[] => list(get(c, 'parameters')).map((p) => field(p, 'text') ?? field(p, 'payload') ?? '');

/** Body parameters as «1», «2», …; the first button's parameter as «button». */
export function templateParams(components: unknown): Record<string, string> | null {
  const out: Record<string, string> = {};
  const parts = list(components);
  const body = parts.find((c) => field(c, 'type')?.toLowerCase() === 'body');
  texts(body).forEach((t, i) => (out[String(i + 1)] = t));
  const button = parts.find((c) => field(c, 'type')?.toLowerCase() === 'button');
  const tap = texts(button)[0];
  if (tap) out['button'] = tap;
  return Object.keys(out).length > 0 ? out : null;
}

function statusOf(m: unknown): DeliveryStatus | null {
  const s = field(m, 'kapso.status');
  return (DELIVERY_STATUSES as readonly (string | null)[]).includes(s) ? (s as DeliveryStatus) : null;
}

/** Meta's mime, else Kapso's media_data, else WhatsApp's default for the type. */
function mimeOf(m: unknown, media: string | null): string | null {
  if (!media) return null;
  const kapso = field(m, 'kapso.media_data.content_type');
  return first(field(m, `${media}.mime_type`), kapso, defaultMediaMime(media));
}

export function externalMessage(m: unknown): ExternalMessage | null {
  const f = (path: string) => field(m, path);
  const to = first(f('to'), f('kapso.phone_number'))?.replace(/^\+/, '') ?? null;
  const [id, type, at] = [f('id'), f('type') ?? 'unknown', messageTime(f('timestamp'))];
  if (!id || !to || !at) return null;
  const media = (MEDIA_TYPES as readonly string[]).includes(type) ? type : null;
  const mf = (key: string) => (media ? f(`${media}.${key}`) : null);
  return {
    waMessageId: id,
    to,
    at,
    type,
    body: first(f('text.body'), mf('caption')),
    templateName: type === 'template' ? f('template.name') : null,
    templateParams: type === 'template' ? templateParams(get(m, 'template.components')) : null,
    mediaId: mf('id'),
    mediaMime: mimeOf(m, media),
    mediaName: mediaFileName(first(mf('filename'), f('kapso.media_data.filename'))),
    replyTo: f('context.id'),
    status: statusOf(m),
    direction: f('kapso.direction'),
    payload: echoPayload(m) as Json | null,
  };
}
