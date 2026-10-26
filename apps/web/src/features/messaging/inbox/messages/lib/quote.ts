import { formatPhone, mediaKindOf, QUOTE_BODY_MAX, quoteLine, type MessageQuote, type MessageView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

// «رد» (owner 2026-10-25): what a quote shows, in the reply strip and on the answering bubble.

/** The message being answered, shaped like the API's reply_to (the body cut to QUOTE_BODY_MAX). */
export const quoteOf = (m: MessageView): MessageQuote => ({
  id: m.id,
  direction: m.direction,
  body: m.body ? m.body.slice(0, QUOTE_BODY_MAX) : null,
  media_mime: m.media_mime,
  template_key: m.template_key,
  sender_name: m.sender_name ?? null,
});

/** Theirs: the chat's name (else its number); ours: who sent it, else «أنت». */
export function quoteSender(q: MessageQuote, chat: { name: string | null; phone: string }): string {
  if (q.direction === 'outbound') return q.sender_name ?? t.inbox.reply.you;
  return chat.name ?? formatPhone(chat.phone);
}

/** The first line of its text, else the file's kind, else «رسالة قالب». */
export function quoteText(q: MessageQuote): string {
  const line = quoteLine(q.body);
  if (line) return line;
  const kind = mediaKindOf(q.media_mime);
  if (kind) return t.inbox.media[kind];
  return q.template_key ? t.inbox.reply.template : t.inbox.media.other;
}
