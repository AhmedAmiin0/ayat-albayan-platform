import { QUOTE_BODY_MAX, type MessageQuote, type MessageView } from '@ab/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { waHttpError } from '../whatsapp/template.mapper';

/** A quoted row as read here: what the bubble shows, and who of staff sent it. */
export interface QuotedRow {
  id: string;
  direction: MessageQuote['direction'];
  body: string | null;
  media_mime: string | null;
  template_key: string | null;
  sender?: { full_name: string } | null;
}

/** The reply fields of our outbound row: our id of the quoted message and its wamid (Meta's context). */
export interface ReplyFields {
  reply_to_message_id: string;
  /** null: the reply leaves from another number than the quoted message (that number never issued the wamid). */
  reply_to_wa_id: string | null;
}

/** The number a send leaves from (sendLine): a line (legacy) and/or a number (module mode). */
export type SendFrom = { line?: string | null; number_id?: string | null };

/** Meta's context only names a wamid of the sending number: a known, different line or number drops it. */
export function sameNumber(quoted: SendFrom, from: SendFrom): boolean {
  if (from.number_id && quoted.number_id) return from.number_id === quoted.number_id;
  return !(from.line && quoted.line && from.line !== quoted.line);
}

const QUOTE_SELECT = 'id, direction, body, media_mime, template_key, sender:profiles!messages_created_by_fkey(full_name)' as const;

/** A template's text is never quoted (a signed link could be in it): the bubble names it a template. */
export function quoteOf(row: QuotedRow): MessageQuote {
  return {
    id: row.id,
    direction: row.direction,
    body: row.template_key ? null : (row.body?.slice(0, QUOTE_BODY_MAX) ?? null),
    media_mime: row.media_mime,
    template_key: row.template_key,
    sender_name: row.direction === 'outbound' ? (row.sender?.full_name ?? null) : null,
  };
}

/** Each view with its quote (same chat only); views without one are returned as they are. */
export function withQuotes(views: readonly MessageView[], quotes: ReadonlyMap<string, MessageQuote>): MessageView[] {
  return views.map((v) => (v.reply_to_message_id ? { ...v, reply_to: quotes.get(v.reply_to_message_id) ?? null } : v));
}

/**
 * «رد» (owner 2026-10-25): a reply quotes a message of the SAME chat that WhatsApp knows (a wamid),
 * and a page's bubbles carry the messages they answer (one read per page, by id and phone).
 */
@Injectable()
export class ThreadQuotes {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** 400 reply_not_in_thread for another chat's message, an unknown id or one without a wamid. */
  async target(phone: string, messageId: string, from: SendFrom = {}): Promise<ReplyFields> {
    const { data, error } = await this.db
      .from('messages')
      .select('id, wa_message_id, line, number_id')
      .eq('id', messageId)
      .eq('phone_e164', phone)
      .maybeSingle();
    if (error) throw new Error(`reply target read failed: ${error.message}`);
    if (!data?.wa_message_id) throw waHttpError('reply_not_in_thread', HttpStatus.BAD_REQUEST);
    // The bubble still quotes it; WhatsApp gets no context it would refuse or drop.
    return { reply_to_message_id: data.id, reply_to_wa_id: sameNumber(data, from) ? data.wa_message_id : null };
  }

  /** The page's views with their quotes; no read at all when nothing on the page answers anything. */
  async attach(views: readonly MessageView[], phone: string): Promise<MessageView[]> {
    const ids = [...new Set(views.flatMap((v) => (v.reply_to_message_id ? [v.reply_to_message_id] : [])))];
    if (ids.length === 0) return [...views];
    const { data, error } = await this.db.from('messages').select(QUOTE_SELECT).in('id', ids).eq('phone_e164', phone);
    if (error) throw new Error(`quoted messages read failed: ${error.message}`);
    return withQuotes(views, new Map((data ?? []).map((r) => [r.id, quoteOf(r)])));
  }
}
