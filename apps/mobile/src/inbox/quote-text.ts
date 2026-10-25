import {
  mediaKindOf,
  type MessageQuote,
  type MessageView,
  QUOTE_BODY_MAX,
  quoteLine,
} from '@ab/shared';
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

/** Its first line; a file says its kind (before the caption); a template says so. */
export function quoteText(q: MessageQuote): string {
  const kind = mediaKindOf(q.media_mime);
  const parts = [kind ? t.inbox.media[kind] : '', quoteLine(q.body)].filter(Boolean);
  if (parts.length) return parts.join(' · ');
  return q.template_key ? t.inbox.reply.template : t.inbox.media.other;
}
