import type { CallPermissionReply, MessageView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { MessageViews, type MessageRow } from '../../whatsapp';
import type { CallPermissionReplyEvent } from '../../webhook';

function check(error: { message: string } | null, what: string): asserts error is null {
  if (error) throw new Error(`${what} failed: ${error.message}`);
}

/**
 * A request row while its one request is out: status failed + this code, never queued, so no sender,
 * catch-up (inFlight) or queue count ever sees it; a crash leaves an honest failed row, not a stuck one.
 */
export const IN_FLIGHT = 'sending';

/** A stored answer to a request (wa_call_permissions, migration 941): the family's phone and its number. */
export type PermissionReplyInput = Omit<CallPermissionReplyEvent, 'from'> & { phone: string };

/**
 * What the dedicated calls number (docs/28 §10) stores apart from wa_calls: the family's answers to a
 * call permission request (wa_call_permissions, API only), its own 24 h window (inbound rows stamped line
 * `calls`) and the outcome of a request sent from it (the messages row the thread shows).
 */
@Injectable()
export class CallsNumberStore {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly views: MessageViews,
  ) {}

  async reply(phoneNumberId: string, phone: string): Promise<CallPermissionReply | null> {
    const { data, error } = await this.db
      .from('wa_call_permissions')
      .select('response, replied_at, expires_at')
      .eq('phone_number_id', phoneNumberId)
      .eq('phone_e164', phone)
      .maybeSingle();
    check(error, 'call permission read');
    if (!data || (data.response !== 'accepted' && data.response !== 'rejected')) return null;
    return { response: data.response, at: data.replied_at, expires_at: data.expires_at };
  }

  /** Upsert by (number, phone); an older answer arriving late never replaces a newer one. */
  async saveReply(input: PermissionReplyInput): Promise<void> {
    const at = input.at.toISOString();
    const current = await this.reply(input.phoneNumberId, input.phone);
    if (current && current.at > at) return;
    const row = { phone_number_id: input.phoneNumberId, phone_e164: input.phone, response: input.response };
    const when = { replied_at: at, expires_at: input.expiresAt?.toISOString() ?? null, updated_at: new Date().toISOString() };
    const { error } = await this.db.from('wa_call_permissions').upsert({ ...row, ...when }, { onConflict: 'phone_number_id,phone_e164' });
    check(error, 'call permission write');
  }

  /** The family's newest message to THIS calls number (its 24 h window); null = none. */
  async lastInbound(phone: string, numberId: string | null): Promise<string | null> {
    if (!numberId) return null;
    const { data, error } = await this.db
      .from('messages')
      .select('created_at')
      .eq('phone_e164', phone)
      .eq('direction', 'inbound')
      .eq('line', 'calls')
      .eq('number_id', numberId)
      .order('created_at', { ascending: false })
      .limit(1);
    check(error, 'calls number window read');
    return data[0]?.created_at ?? null;
  }

  /** The request went out: sent with its wamid (only from the row this request holds in flight). */
  async sent(id: string, waMessageId: string): Promise<MessageRow | null> {
    const at = new Date().toISOString();
    const patch = { status: 'sent' as const, sent_at: at, wa_message_id: waMessageId, error_code: null, error_text: null };
    return this.finish(id, patch);
  }

  /** WhatsApp refused it (or the answer was lost): failed with the short code, never retried. */
  failed(id: string, code: string): Promise<MessageRow | null> {
    return this.finish(id, { status: 'failed', error_code: code, error_text: null, next_attempt_at: null });
  }

  view(row: MessageRow): Promise<MessageView> {
    return this.views.view(row);
  }

  private async finish(id: string, patch: Partial<MessageRow>): Promise<MessageRow | null> {
    const { data, error } = await this.db.from('messages').update(patch).eq('id', id).eq('error_code', IN_FLIGHT).select('*').maybeSingle();
    check(error, 'call permission request write');
    return data;
  }
}
