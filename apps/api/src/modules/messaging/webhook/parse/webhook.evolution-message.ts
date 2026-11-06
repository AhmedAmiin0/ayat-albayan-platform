import { z } from 'zod';

// One Evolution (Baileys) message → the Meta message object the webhook already reads
// (webhook.parse.ts toInbound), so an Evolution number's inbound takes the SAME path as Meta's and
// Kapso's: row, thread summary, broadcast, push (docs/19 «Evolution driver»). The media id is the
// Evolution message id: the bytes come from Evolution when the file is first opened.

const keySchema = z.object({
  id: z.string().min(1).max(200),
  remoteJid: z.string().max(200),
  remoteJidAlt: z.string().max(200).nullish(),
  fromMe: z.boolean().optional(),
});

const media = z.object({
  caption: z.string().nullish(),
  mimetype: z.string().nullish(),
  fileName: z.string().nullish(),
});

const contentSchema = z.object({
  conversation: z.string().nullish(),
  extendedTextMessage: z.object({ text: z.string().nullish() }).nullish(),
  imageMessage: media.nullish(),
  videoMessage: media.nullish(),
  audioMessage: media.nullish(),
  stickerMessage: media.nullish(),
  documentMessage: media.nullish(),
  documentWithCaptionMessage: z
    .object({ message: z.object({ documentMessage: media.nullish() }).nullish() })
    .nullish(),
  reactionMessage: z
    .object({ key: z.object({ id: z.string() }).nullish(), text: z.string().nullish() })
    .nullish(),
});

const baileysMessageSchema = z.object({
  key: keySchema,
  pushName: z.string().max(200).nullish(),
  message: contentSchema.nullish(),
  contextInfo: z.object({ stanzaId: z.string().nullish() }).nullish(),
  messageTimestamp: z.union([z.number(), z.string()]).nullish(),
});
type BaileysMessage = z.infer<typeof baileysMessageSchema>;
type Content = z.infer<typeof contentSchema>;
type Media = z.infer<typeof media>;

/** A person's chat only: never a group, a status broadcast or a channel. */
const PERSON_JID = /^(\d{6,20})(?::\d+)?@s\.whatsapp\.net$/;

/** The family's international digits; a @lid chat uses its phone jid (remoteJidAlt) when given. */
function digitsOf(key: BaileysMessage['key']): string | null {
  const jid = key.remoteJid.endsWith('@lid') ? (key.remoteJidAlt ?? '') : key.remoteJid;
  return PERSON_JID.exec(jid)?.[1] ?? null;
}

type MetaBody = Record<string, unknown>;

const file = (id: string, m: Media, type: string): MetaBody => ({
  type,
  [type]: {
    id,
    ...(m.mimetype ? { mime_type: m.mimetype } : {}),
    ...(m.caption ? { caption: m.caption } : {}),
    ...(type === 'document' && m.fileName ? { filename: m.fileName } : {}),
  },
});

type Part = (c: Content, id: string) => MetaBody | null;

const textOf = (body: string | null | undefined): MetaBody | null =>
  body ? { type: 'text', text: { body } } : null;

const fileOf = (m: Media | null | undefined, id: string, type: string): MetaBody | null =>
  m ? file(id, m, type) : null;

/** A document, plain or «with caption» (Baileys wraps the captioned one). */
const docOf = (c: Content): Media | null | undefined =>
  c.documentMessage ?? c.documentWithCaptionMessage?.message?.documentMessage;

/** The first content kind the message carries wins; anything else is «unsupported». */
const PARTS: readonly Part[] = [
  (c) => textOf(c.conversation),
  (c) => textOf(c.extendedTextMessage?.text),
  (c, id) => fileOf(c.imageMessage, id, 'image'),
  (c, id) => fileOf(c.videoMessage, id, 'video'),
  (c, id) => fileOf(c.audioMessage, id, 'audio'),
  (c, id) => fileOf(c.stickerMessage, id, 'sticker'),
  (c, id) => fileOf(docOf(c), id, 'document'),
  (c) => {
    const r = c.reactionMessage;
    return r?.key ? { type: 'reaction', reaction: { message_id: r.key.id, emoji: r.text ?? '' } } : null;
  },
];

function bodyOf(content: Content | null | undefined, id: string): MetaBody {
  const found = content ? PARTS.map((p) => p(content, id)).find((b) => b !== null) : null;
  return found ?? { type: 'unsupported' };
}

interface MetaShaped {
  from: string;
  name: string | null;
  message: MetaBody;
}

/** One family message as Meta's object; null = ours (fromMe), a group, or not a message. */
export function evolutionMetaMessage(raw: unknown): MetaShaped | null {
  const m = familyMessage(raw);
  const from = m ? digitsOf(m.key) : null;
  return m && from ? { from, name: m.pushName ?? null, message: metaOf(m, from) } : null;
}

/** A parsed message the family sent (never ours: fromMe). */
function familyMessage(raw: unknown): BaileysMessage | null {
  const parsed = baileysMessageSchema.safeParse(raw);
  return parsed.success && parsed.data.key.fromMe !== true ? parsed.data : null;
}

const timestampOf = (ts: BaileysMessage['messageTimestamp']): MetaBody =>
  ts ? { timestamp: String(ts) } : {};

const contextOf = (stanza: string | null | undefined): MetaBody =>
  stanza ? { context: { id: stanza } } : {};

function metaOf(m: BaileysMessage, from: string): MetaBody {
  return {
    from,
    id: m.key.id,
    ...timestampOf(m.messageTimestamp),
    ...bodyOf(m.message, m.key.id),
    ...contextOf(m.contextInfo?.stanzaId),
  };
}
