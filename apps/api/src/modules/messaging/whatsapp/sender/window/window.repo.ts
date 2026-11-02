import type { TablesInsert } from '@ab/db';
import { AWAITING_REPLY } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { WaitingRow } from './window-rules';

/** At most this many waiting rows are looked at per pass (oldest first). */
const RELEASE_BATCH = 200;
/** The reopen rows' dedup prefix: `reopen:<E.164>:<Riyadh day>` (reopenDedupKey, shared). */
const REOPEN_PREFIX = 'reopen:%';

/** A held row: from when it waits, until when (next_attempt_at = expires_at = the deadline). */
export interface HoldWrite {
  id: string;
  since: Date;
  until: Date;
}

const fail = (what: string, message: string): Error => new Error(`${what} failed: ${message}`);

/**
 * The 24 h window's reads and writes on `messages` (owner 2026-11-03). Every state change is
 * compare-and-set on status = queued, so two API instances never hold, release or fail one row
 * twice; the reopen template row is deduped by its dedup_key (rule 8).
 */
@Injectable()
export class WindowRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Any reopen template of this phone since `since` (whatever its status), or one still queued. */
  async reopenSince(phone: string, since: Date): Promise<boolean> {
    const { data, error } = await this.db
      .from('messages')
      .select('id')
      .eq('phone_e164', phone)
      .eq('direction', 'outbound')
      .like('dedup_key', REOPEN_PREFIX)
      .or(`created_at.gte.${since.toISOString()},status.eq.queued`)
      .limit(1);
    if (error) throw fail('reopen read', error.message);
    return data.length > 0;
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
        error_text: null,
        scheduled_for: h.since.toISOString(),
        expires_at: until,
        next_attempt_at: until,
      })
      .eq('id', h.id)
      .eq('status', 'queued')
      .select('id');
    if (error) throw fail('message hold', error.message);
    return data.length > 0;
  }

  /** Failed for good, with no try counted (the hold's own refusals). */
  async fail(id: string, why: { code: string; text: string }): Promise<void> {
    const { error } = await this.db
      .from('messages')
      .update({
        status: 'failed',
        error_code: why.code,
        error_text: why.text,
        next_attempt_at: null,
      })
      .eq('id', id)
      .eq('status', 'queued');
    if (error) throw fail('message hold failure', error.message);
  }

  /** Every queued AWAITING_REPLY row (held, or just queued by the inbox), oldest first. */
  async waiting(): Promise<WaitingRow[]> {
    const { data, error } = await this.db
      .from('messages')
      .select('id, phone_e164, created_at, scheduled_for')
      .eq('direction', 'outbound')
      .eq('status', 'queued')
      .eq('error_code', AWAITING_REPLY)
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

  /** Released: due now again, with its deadline kept (expires_at: never sent after it). */
  async release(ids: readonly string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const { data, error } = await this.db
      .from('messages')
      .update({ error_code: null, error_text: null, next_attempt_at: null })
      .in('id', [...ids])
      .eq('status', 'queued')
      .eq('error_code', AWAITING_REPLY)
      .select('id');
    if (error) throw fail('held messages release', error.message);
    return data.length;
  }
}
