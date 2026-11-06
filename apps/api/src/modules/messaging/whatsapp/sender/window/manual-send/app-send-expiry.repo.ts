import { APP_SEND_GRACE_MS, APP_SEND_UNCONFIRMED } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { SENDING } from '@/modules/messaging/whatsapp/sender/send-plan';
import type { HeldRow } from './app-send-adopt';

/** Not claimed by the sender, and not already answered-for (already unconfirmed). */
const OPEN = `error_code.is.null,error_code.not.in.(${SENDING},${APP_SEND_UNCONFIRMED})`;
/** Rows per pass; the rest wait for the next tick. */
const BATCH = 100;

export const UNCONFIRMED_TEXT =
  'sent from WhatsApp? no echo came back: never sent by the platform until staff answer';

const settledAt = (now: Date): string => new Date(now.getTime() - APP_SEND_GRACE_MS).toISOString();

/** The sweep's read and compare-and-set (app-send-expiry.ts). */
@Injectable()
export class AppSendExpiryRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Outbound rows whose «أرسل عبر واتساب» window ended over APP_SEND_GRACE_MS ago with no wamid
   * attached, still queued (held) or failed, not claimed and not yet unconfirmed.
   */
  async settled(now: Date): Promise<HeldRow[]> {
    const { data, error } = await this.db
      .from('messages')
      .select('id, phone_e164, body, line, number_id, created_at, lead_id, dedup_key')
      .eq('direction', 'outbound')
      .in('status', ['queued', 'failed'])
      .is('wa_message_id', null)
      .not('app_send_until', 'is', null)
      .lte('app_send_until', settledAt(now))
      .or(OPEN)
      .order('app_send_until', { ascending: true })
      .limit(BATCH);
    if (error) throw new Error(`app send expiry read failed: ${error.message}`);
    return data;
  }

  /**
   * These rows → failed APP_SEND_UNCONFIRMED, compare-and-set on the same conditions (an echo,
   * an answer or a new tap meanwhile wins). app_send_until is kept, so a late echo of the same
   * text still attaches. Returns the ids moved.
   */
  async expire(ids: readonly string[], now: Date): Promise<string[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.db
      .from('messages')
      .update({
        status: 'failed',
        error_code: APP_SEND_UNCONFIRMED,
        error_text: UNCONFIRMED_TEXT,
        next_attempt_at: null,
      })
      .in('id', [...ids])
      .in('status', ['queued', 'failed'])
      .is('wa_message_id', null)
      .lte('app_send_until', settledAt(now))
      .or(OPEN)
      .select('id');
    if (error) throw new Error(`app send expiry failed: ${error.message}`);
    return data.map((r) => r.id);
  }
}
