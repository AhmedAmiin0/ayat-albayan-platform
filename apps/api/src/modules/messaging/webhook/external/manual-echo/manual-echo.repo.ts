import type { TablesUpdate } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { SENDING, stampDelivered } from '@/modules/messaging/whatsapp';
import type { AppSendRow } from './manual-echo';

/** Postgres unique_violation: the wamid is already on another row (a concurrent store). */
const UNIQUE = '23505';
/** Not claimed by the sender (its claim writes SENDING): it may be sending that row right now. */
const NOT_CLAIMED = `error_code.is.null,error_code.neq.${SENDING}`;
/** Held, failed, or marked by hand meanwhile: never a row the platform sent (it has a wamid). */
const ATTACHABLE = ['queued', 'failed', 'sent_manually'] as const;

/** The window and every hold / retry field: the row is a sent message now. */
const CLEARED = {
  app_send_until: null,
  error_code: null,
  error_text: null,
  next_attempt_at: null,
  expires_at: null,
  scheduled_for: null,
} as const;

const fail = (what: string, message: string): Error => new Error(`${what} failed: ${message}`);

/** One attach: the row, the external message's wamid, its status and times (attachPatch). */
export interface AttachWrite {
  row: AppSendRow;
  waMessageId: string;
  patch: TablesUpdate<'messages'>;
}

/** The read and the compare-and-set of the «أرسل عبر واتساب» attach (manual-echo.service.ts). */
@Injectable()
export class ManualEchoRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** This phone's staff outbound rows with no wamid whose app_send_until falls in the span. */
  async candidates(phone: string, span: { since: Date; until: Date }): Promise<AppSendRow[]> {
    const { data, error } = await this.db
      .from('messages')
      .select('id, body, line, number_id, app_send_until, lead_id, dedup_key, status')
      .eq('phone_e164', phone)
      .eq('direction', 'outbound')
      .not('created_by', 'is', null)
      .is('wa_message_id', null)
      .gte('app_send_until', span.since.toISOString())
      .lte('app_send_until', span.until.toISOString());
    if (error) throw fail('app send rows read', error.message);
    return data;
  }

  /**
   * The message's wamid and status on the row, its window and hold cleared, compare-and-set: still
   * no wamid (never overwritten), a window still set, not claimed by the sender. false when
   * another message took it, the sender claimed it, or the wamid is on another row (unique).
   */
  async attach(w: AttachWrite): Promise<boolean> {
    const now = new Date().toISOString();
    const { data, error } = await this.db
      .from('messages')
      .update({ ...w.patch, ...CLEARED, wa_message_id: w.waMessageId, sent_manually_at: now })
      .eq('id', w.row.id)
      .is('wa_message_id', null)
      .not('app_send_until', 'is', null)
      .in('status', [...ATTACHABLE])
      .or(NOT_CLAIMED)
      .select('id');
    if (error?.code === UNIQUE) return false;
    if (error) throw fail('app send attach', error.message);
    if (data.length === 0) return false;
    const at = w.patch.sent_at ?? now;
    await stampDelivered(this.db, { leadId: w.row.lead_id, dedupKey: w.row.dedup_key, at });
    return true;
  }
}
