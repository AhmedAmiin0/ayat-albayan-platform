import { z } from 'zod';
import { E164_RE } from '@ab/core';
import { baseMime } from '../../schemas/chat-media.js';
import { isPdfMime } from '../chat/chat-files.js';
import type { MessageDirection } from '@ab/catalog';

// «رد» and «إعادة توجيه» in the inbox (owner 2026-10-25). Pure: the API, the web and the app share it.

/** A forward reaches at most this many chats at once. */
export const FORWARD_MAX_TARGETS = 5;
/** How much of the quoted text the API sends; the clients show its first line. */
export const QUOTE_BODY_MAX = 200;

/** POST /threads/forward: one message copied to 1–5 other chats; the id makes a retry return the same rows. */
export const threadForwardSchema = z.object({
  messageId: z.uuid(),
  targets: z
    .array(z.string().regex(E164_RE))
    .min(1)
    .max(FORWARD_MAX_TARGETS)
    .refine((t) => new Set(t).size === t.length, { message: 'duplicate_target' }),
  clientRequestId: z.uuid(),
});
export type ThreadForward = z.infer<typeof threadForwardSchema>;

/** The message a bubble answers, as the bubble shows it (same chat only). */
export interface MessageQuote {
  id: string;
  direction: MessageDirection;
  /** The text, cut to QUOTE_BODY_MAX; null for a file without a caption or a template. */
  body: string | null;
  media_mime: string | null;
  template_key: string | null;
  /** Ours: who sent it (D4); null for theirs or an automatic message. */
  sender_name: string | null;
}

/**
 * WhatsApp named a quoted message we do not hold (never stored, owner 2026-10-31): the bubble shows
 * «رسالة غير متاحة», greyed, with nothing to jump to.
 */
export interface UnavailableQuote {
  unavailable: true;
}

/** A bubble's reply_to: the quoted message, or the marker that WhatsApp quoted one we lack. */
export type ReplyQuote = MessageQuote | UnavailableQuote;

export const UNAVAILABLE_QUOTE: UnavailableQuote = { unavailable: true };

export const isUnavailableQuote = (q: ReplyQuote): q is UnavailableQuote => 'unavailable' in q;

/** Why a forward target got nothing (the send path's own error codes). */
export type ForwardSkip =
  | 'session_closed'
  | 'not_your_thread'
  | 'own_thread_read_only'
  | 'line_not_configured'
  | 'files_forbidden'
  | 'send_failed';

/** One target of a forward: the copy queued (its message id), or skipped and why. */
export type ForwardResult =
  | { phone: string; sent: true; message_id: string }
  | { phone: string; sent: false; reason: ForwardSkip };

/** POST /threads/forward's answer, in the order of the request's targets. */
export interface ForwardResponse {
  results: ForwardResult[];
}

type Quotable = { replyable?: boolean; template_key: string | null };

/** «رد»: a message WhatsApp knows (it has a wamid), template or not. */
export const canReply = (m: Pick<Quotable, 'replyable'>): boolean => m.replyable === true;

/** «إعادة توجيه»: a text or a file we hold (or can fetch), never a template. */
export function canForward(m: Quotable & { body: string | null; media_mime: string | null; forwardable?: boolean }): boolean {
  return !m.template_key && m.forwardable === true && (!!m.body?.trim() || !!m.media_mime);
}

/** The quote's first line, trimmed; '' when it has no text. */
export const quoteLine = (body: string | null): string => (body ?? '').trim().split('\n')[0]?.trim() ?? '';

/** What kind of file a quote or a forward carries, for its label (inbox.media.*). */
export function mediaKindOf(mime: string | null): 'image' | 'audio' | 'video' | 'document' | null {
  if (!mime) return null;
  const base = baseMime(mime);
  if (base.startsWith('image/')) return 'image';
  if (base.startsWith('audio/')) return 'audio';
  if (base.startsWith('video/')) return 'video';
  return 'document';
}

/** A quote's file, WhatsApp-style: a PDF is named apart from other documents. */
export type QuoteKind = NonNullable<ReturnType<typeof mediaKindOf>> | 'pdf';

export const quoteKindOf = (mime: string | null): QuoteKind | null =>
  isPdfMime(mime) ? 'pdf' : mediaKindOf(mime);

/** The small icon before a quoted file's line (📷 صورة, 📄 ملف PDF, 🎤 رسالة صوتية). */
const QUOTE_ICONS: Readonly<Record<QuoteKind, string>> = {
  image: '📷',
  audio: '🎤',
  video: '🎥',
  pdf: '📄',
  document: '📄',
};

/** A quoted file's icon, as WhatsApp draws it before the line; null for a text. */
export function quoteIcon(q: Pick<MessageQuote, 'media_mime'>): string | null {
  const kind = quoteKindOf(q.media_mime);
  return kind ? QUOTE_ICONS[kind] : null;
}

/** The words a quote's line needs: inbox.media and inbox.reply.template of ar.json / en.json. */
export interface QuoteWords {
  media: Readonly<Record<QuoteKind | 'other', string>>;
  template: string;
}

/**
 * A quote's line, as WhatsApp (owner 2026-10-31): its first line; a file without a caption says its
 * kind («ملف PDF» apart); a template says so; nothing at all says it cannot be shown.
 */
export function quoteSnippet(q: MessageQuote, words: QuoteWords): string {
  const line = quoteLine(q.body);
  if (line) return line;
  const kind = quoteKindOf(q.media_mime);
  if (kind) return words.media[kind];
  return q.template_key ? words.template : words.media.other;
}
