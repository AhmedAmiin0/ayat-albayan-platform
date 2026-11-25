import { QUOTE_BODY_MAX, quoteSnippet, type MessageQuote, type MessageView } from '@ab/shared';
import { formatPhone } from '@ab/core';
import { t } from '@ab/web-kit';

/** The message being answered, shaped like the API's reply_to (the body cut to QUOTE_BODY_MAX). */
export const quoteOf = (m: MessageView): MessageQuote => ({
  id: m.id,
  direction: m.direction,
  body: m.body ? m.body.slice(0, QUOTE_BODY_MAX) : null,
  media_mime: m.media_mime,
  template_key: m.template_key,
  sender_name: m.sender_name ?? null,
});

export function quoteSender(q: MessageQuote, chat: { name: string | null; phone: string }): string {
  if (q.direction === 'outbound') return q.sender_name ?? t.inbox.reply.you;
  return chat.name ?? formatPhone(chat.phone);
}

export const quoteText = (q: MessageQuote): string =>
  quoteSnippet(q, { media: t.inbox.media, template: t.inbox.reply.template });
