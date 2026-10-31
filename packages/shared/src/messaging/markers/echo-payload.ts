import { adWelcomeOf, chatMarkerOf, markerPayload } from './chat-markers.js';

// messages.interactive_payload of a message the business sent outside the app (an echo of the
// WhatsApp Business app, or an item of Kapso's history), read from Meta's message object. It
// replaces the old «[edit]» / «[image]» placeholder bodies (owner 2026-10-30): the row says what it
// is, the client words it (marker-notes.ts) or shows the file.

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** WhatsApp's own format per media type, when neither Meta nor Kapso names the file's mime. */
const DEFAULT_MIME: Readonly<Record<string, string>> = {
  image: 'image/jpeg',
  sticker: 'image/webp',
  audio: 'audio/ogg',
  video: 'video/mp4',
  document: 'application/octet-stream',
};

/** Carried by the row itself (body, template_key): no payload. */
const OWN_CONTENT = new Set(['text', 'template']);

export const defaultMediaMime = (type: string): string | null => DEFAULT_MIME[type] ?? null;

/**
 * The stored payload: a marker (edit / revoke / reaction, chat-markers.ts); Kapso's «errors» (the
 * click-to-WhatsApp ad's automatic welcome) with the ad's text when the item carries it; any other
 * type as Meta sent it ({type, [type]: …, errors?}), like an inbound row. Null for a text or a
 * template.
 */
export function echoPayload(message: unknown): Record<string, unknown> | null {
  const type = isRecord(message) && typeof message.type === 'string' ? message.type : null;
  if (!isRecord(message) || type === null || OWN_CONTENT.has(type)) return null;
  const marker = chatMarkerOf(message);
  if (marker) return markerPayload(marker);
  return type === 'errors' ? errorsPayload(message) : asSent(message, type);
}

/** Kapso's «errors» item: the ad's automatic welcome, with its text when the item carries it. */
const errorsPayload = (m: Record<string, unknown>) => ({
  type: 'errors',
  errors: m.errors ?? null,
  welcome: adWelcomeOf(m),
});

/** Any other type as Meta sent it ({type, [type]: …, errors?}), like an inbound row. */
function asSent(m: Record<string, unknown>, type: string): Record<string, unknown> {
  return { type, [type]: m[type] ?? null, ...(m.errors === undefined ? {} : { errors: m.errors }) };
}
