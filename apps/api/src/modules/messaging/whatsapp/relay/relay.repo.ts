import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { CLAIM_LEASE_MS, SENDING, UNCERTAIN } from '@/modules/messaging/whatsapp/sender/send-plan';

// The relay's messages rows (docs/19 «script relay»). Written claimed (error_code SENDING, a
// lease) so the outbox worker never sends it itself; no lead, guardian or staff is linked
// (created_by null).

export interface RelayRowInput {
  phone: string;
  body: string;
  dedupKey: string;
  numberId: string | undefined;
  now: Date;
}

/** A relay row's ids as the script gets them back. */
export interface RelayIds {
  id: string;
  waMessageId: string | null;
}

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class RelayRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The new row's ids, or null when the dedup key is already taken (a retry inside the window). */
  async insert(input: RelayRowInput): Promise<RelayIds | null> {
    const lease = new Date(input.now.getTime() + CLAIM_LEASE_MS).toISOString();
    const { data, error } = await this.db
      .from('messages')
      .insert({
        direction: 'outbound',
        line: 'notifications',
        phone_e164: input.phone,
        body: input.body,
        dedup_key: input.dedupKey,
        created_by: null,
        attempts: 1,
        next_attempt_at: lease,
        error_code: SENDING,
        ...(input.numberId ? { number_id: input.numberId } : {}),
      })
      .select('id')
      .single();
    if (error?.code === UNIQUE_VIOLATION) return null;
    if (error) throw new Error(`relay row insert failed: ${error.message}`);
    return { id: data.id, waMessageId: null };
  }

  /** The row that already holds this dedup key. */
  async byDedupKey(dedupKey: string): Promise<RelayIds | null> {
    const { data, error } = await this.db
      .from('messages')
      .select('id, wa_message_id')
      .eq('dedup_key', dedupKey)
      .maybeSingle();
    if (error) throw new Error(`relay row read failed: ${error.message}`);
    return data ? { id: data.id, waMessageId: data.wa_message_id } : null;
  }

  /** Sent: the wamid (null when the CRM gave none) moves it on with the delivery ticks. */
  async sent(input: { id: string; waMessageId: string | null; at: Date }): Promise<void> {
    const { error } = await this.db
      .from('messages')
      .update({
        status: 'sent',
        sent_at: input.at.toISOString(),
        wa_message_id: input.waMessageId,
        next_attempt_at: null,
        error_code: null,
        error_text: null,
      })
      .eq('id', input.id);
    if (error) throw new Error(`relay sent write failed: ${error.message}`);
  }

  /** May have been sent: kept and held for the admin (uncertain), never resent by the worker. */
  async uncertain(input: { id: string; text: string }): Promise<void> {
    const { error } = await this.db
      .from('messages')
      .update({
        status: 'failed',
        next_attempt_at: null,
        error_code: UNCERTAIN,
        error_text: input.text,
      })
      .eq('id', input.id);
    if (error) throw new Error(`relay failure write failed: ${error.message}`);
  }

  /** Never sent: the row goes, so the script's own retry is a fresh send (nothing to resend). */
  async drop(id: string): Promise<void> {
    const { error } = await this.db.from('messages').delete().eq('id', id);
    if (error) throw new Error(`relay row delete failed: ${error.message}`);
  }
}
