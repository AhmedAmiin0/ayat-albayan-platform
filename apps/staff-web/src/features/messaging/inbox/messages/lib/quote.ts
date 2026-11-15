import { formatPhone, QUOTE_BODY_MAX, quoteSnippet, type MessageQuote, type MessageView } from '@ab/shared';
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

/** The first line of its text, else the file's kind («ملف PDF» apart), else «رسالة قالب». */
export const quoteText = (q: MessageQuote): string =>
  quoteSnippet(q, { media: t.inbox.media, template: t.inbox.reply.template });
