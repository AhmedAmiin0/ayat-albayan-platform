import type { TablesInsert } from '@ab/db';
import { AWAITING_REPLY } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { UNCERTAIN } from '@/modules/messaging/whatsapp/sender/send-plan';
import type { ReopenRow } from './reopen-state';
import type { FailWhy } from './window-reopen';
import type { WaitingRow } from './window-rules';

/** Waiting rows are read in pages of this many (oldest first, by created_at). */
export const RELEASE_BATCH = 200;
/** The reopen rows' dedup prefix: `reopen:<E.164>:<Riyadh day>` (reopenDedupKey, shared). */
const REOPEN_PREFIX = 'reopen:%';
/** Not failed, or failed `uncertain` (it may have reached the family: reopenLive). */
const NOT_DEAD = `status.neq.failed,error_code.eq.${UNCERTAIN}`;

/** A held row: from when it waits, until when (next_attempt_at = expires_at = the deadline). */
interface HoldWrite {
  id: string;
  /** The error_code it must still carry (compare-and-set): AWAITING_REPLY or SENDING. */
  from: string;
  since: Date;
  until: Date;
  /** error_text while held: null behind a template, NO_TEMPLATE_NOTE under «بدون قالب». */
  note: string | null;
}
const fail = (what: string, message: string): Error => new Error(`${what} failed: ${message}`);

/**
 * The 24 h window's reads and writes on `messages` (owner 2026-11-03). Every state change is
 * compare-and-set on status = queued; the reopen template row is deduped by its dedup_key (rule 8).
 */
@Injectable()
export class WindowRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Reopen rows since `since`; liveOnly (the release): no plain failed row (Supabase max-rows). */
  async reopens(phones: readonly string[], since: Date, liveOnly = false): Promise<ReopenRow[]> {
    if (phones.length === 0) return [];
    const query = this.db
      .from('messages')
      .select('phone_e164, status, error_code, expires_at, created_at, dedup_key')
      .in('phone_e164', [...phones])
      .eq('direction', 'outbound')
      .like('dedup_key', REOPEN_PREFIX)
      .gte('created_at', since.toISOString());
    const { data, error } = await (liveOnly ? query.or(NOT_DEAD) : query);
    if (error) throw fail('reopen read', error.message);
    return data;
  }

  /** The reopen template row; a replayed dedup_key inserts nothing. */
  async queueReopen(row: TablesInsert<'messages'>): Promise<void> {
    const { error } = await this.db
      .from('messages')
      .upsert(row, { onConflict: 'dedup_key', ignoreDuplicates: true });
    if (error) throw fail('reopen enqueue', error.message);
  }

  /** Held: AWAITING_REPLY, due again only at its deadline. false = another worker got it first. */
  async hold(h: HoldWrite): Promise<boolean> {
    const until = h.until.toISOString();
    const { data, error } = await this.db
      .from('messages')
      .update({
        error_code: AWAITING_REPLY,
        error_text: h.note,
        scheduled_for: h.since.toISOString(),
        expires_at: until,
        next_attempt_at: until,
      })
      .eq('id', h.id)
      .eq('status', 'queued')
      .eq('error_code', h.from)
      .select('id');
    if (error) throw fail('message hold', error.message);
    return data.length > 0;
  }

  /** A held row's error_text (Kapso's reopen failed), only while held. */
  async note(id: string, text: string): Promise<void> {
    const { error } = await this.db
      .from('messages')
      .update({ error_text: text })
      .eq('id', id)
      .eq('status', 'queued')
      .eq('error_code', AWAITING_REPLY);
    if (error) throw fail('held message note', error.message);
  }

  /** Failed for good, with no try counted (the hold's own refusals). */
  async fail(ids: readonly string[], why: FailWhy & { from: string }): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.db
      .from('messages')
      .update({
        status: 'failed',
        error_code: why.code,
        error_text: why.text,
        next_attempt_at: null,
      })
      .in('id', [...ids])
      .eq('status', 'queued')
      .eq('error_code', why.from);
    if (error) throw fail('message hold failure', error.message);
  }

  /** One page of queued AWAITING_REPLY rows (held, or just queued), oldest first, after `after`. */
  async waiting(after: string | null): Promise<WaitingRow[]> {
    const query = this.db
      .from('messages')
      .select('id, phone_e164, created_at, scheduled_for, error_text, expires_at')
      .eq('direction', 'outbound')
      .eq('status', 'queued')
      .eq('error_code', AWAITING_REPLY);
    const { data, error } = await (after ? query.gt('created_at', after) : query)
      .order('created_at', { ascending: true })
      .limit(RELEASE_BATCH);
    if (error) throw fail('held messages read', error.message);
    return data;
  }

  /** Each phone's newest chat-line inbound (thread_summaries); a phone with none is absent. */
  async lastChatInbound(phones: readonly string[]): Promise<Map<string, string>> {
    if (phones.length === 0) return new Map();
    const { data, error } = await this.db
      .from('thread_summaries')
      .select('phone_e164, last_chat_inbound_at')
      .in('phone_e164', [...phones]);
    if (error) throw fail('chat inbound read', error.message);
    const pairs = data.flatMap((r): [string, string][] =>
      r.last_chat_inbound_at ? [[r.phone_e164, r.last_chat_inbound_at]] : [],
    );
    return new Map(pairs);
  }

  /** Released: due now, in written order (scheduled_for cleared); its deadline is kept. */
  async release(ids: readonly string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const { data, error } = await this.db
      .from('messages')
      .update({ error_code: null, error_text: null, next_attempt_at: null, scheduled_for: null })
      .in('id', [...ids])
      .eq('status', 'queued')
      .eq('error_code', AWAITING_REPLY)
      .select('id');
    if (error) throw fail('held messages release', error.message);
    return data.length;
  }
}
