import { type MessageQuote, type MessageView, QUOTE_BODY_MAX, quoteSnippet } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

// The words of a quote (owner 2026-10-25 «رد»): over a bubble that answers one, and in the composer's strip.

/** A loaded message as the quote the API would send for it (the reply target before it is sent). */
export function quoteOf(m: MessageView): MessageQuote {
  return {
    id: m.id,
    direction: m.direction,
    body: m.template_key ? null : (m.body?.slice(0, QUOTE_BODY_MAX) ?? null),
    media_mime: m.media_mime,
    template_key: m.template_key,
    sender_name: m.direction === 'outbound' ? (m.sender_name ?? null) : null,
  };
}

/** Theirs: the chat's name (or number); ours: who sent it, else «أنت». */
export function quoteSender(q: MessageQuote, threadName: string | null): string {
  if (q.direction === 'inbound') return threadName ?? '';
  return q.sender_name ?? t.inbox.reply.you;
}

/**
 * Its first line, as WhatsApp (owner 2026-10-31): a file without a caption says its kind («ملف PDF»
 * apart; quoteIcon stands before either); a template says so.
 */
export function quoteText(q: MessageQuote): string {
  return quoteSnippet(q, { media: t.inbox.media, template: t.inbox.reply.template });
}
