import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { CrmReceived } from './crm-received.schema';
import type { CrmQueueRow } from './crm-inbound.event';
import { pgError } from '@/common/db/errors';
import type { PostgrestError } from '@supabase/supabase-js';

// The CRM inbound queue (migration 20261121000100, docs/19 «crm driver»): a message.received is
// stored by its wamid (a re-sent delivery is a no-op), read when due, deleted once in the inbox.

const TABLE = 'crm_inbound_queue';

const check = (error: PostgrestError | null): void => {
  if (error) throw pgError(error);
};

/** A failed lookup: the row stays, tried again at nextAt. */
interface RetryWrite {
  waMessageId: string;
  attempts: number;
  nextAt: Date;
  error: string;
}

@Injectable()
export class CrmInboundRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async enqueue(r: CrmReceived): Promise<void> {
    const row = {
      wa_message_id: r.waMessageId,
      conversation_id: r.conversationId,
      contact_id: r.contactId,
      content_type: r.contentType,
      body: r.text,
      received_at: r.at.toISOString(),
    };
    const opts = { onConflict: 'wa_message_id', ignoreDuplicates: true };
    const { error } = await this.db.from(TABLE).upsert(row, opts);
    check(error);
  }

  async due(now: Date, limit: number): Promise<CrmQueueRow[]> {
    const { data, error } = await this.db
      .from(TABLE)
      .select('*')
      .lte('next_at', now.toISOString())
      .order('next_at', { ascending: true })
      .limit(limit);
    check(error);
    return data ?? [];
  }

  async done(waMessageId: string): Promise<void> {
    const { error } = await this.db.from(TABLE).delete().eq('wa_message_id', waMessageId);
    check(error);
  }

  /** Teachers use the platform chat only: this E.164 is an active teacher's. */
  async isActiveTeacher(phone: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('teachers')
      .select('id')
      .eq('status', 'active')
      .eq('phone_e164', phone)
      .limit(1);
    check(error);
    return (data ?? []).length > 0;
  }

  async retry(w: RetryWrite): Promise<void> {
    const patch = { attempts: w.attempts, next_at: w.nextAt.toISOString(), last_error: w.error };
    const { error } = await this.db.from(TABLE).update(patch).eq('wa_message_id', w.waMessageId);
    check(error);
  }
}
