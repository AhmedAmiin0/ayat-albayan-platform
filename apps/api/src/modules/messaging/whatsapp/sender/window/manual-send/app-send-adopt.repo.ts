import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { stampDelivered } from '@/modules/messaging/whatsapp/messages/delivered';
import type { HeldRow, TwinRow } from './app-send-adopt';

/** How far back a held text looks for the app's message (the tap, the expiry sweep). */
const TWIN_MS = 30 * 60_000;
const SENT = ['sent', 'delivered', 'read'] as const;

const fail = (what: string, message: string): Error => new Error(`${what} failed: ${message}`);

/** The read and the one transaction of the adopt (app-send-adopt.ts, docs/19). */
@Injectable()
export class AppSendAdoptRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * The phone's external outbound plain texts (created_at = WhatsApp's time) from the last TWIN_MS
   * and never before the held row was written: no staff, no dedup key, never tried, a wamid, not
   * failed; no template, file or marker. Oldest first.
   */
  async twins(held: HeldRow, now: Date): Promise<TwinRow[]> {
    const since = Math.max(now.getTime() - TWIN_MS, Date.parse(held.created_at));
    const { data, error } = await this.db
      .from('messages')
      .select('id, body, line, number_id')
      .eq('phone_e164', held.phone_e164)
      .eq('direction', 'outbound')
      .is('created_by', null)
      .is('dedup_key', null)
      .eq('attempts', 0)
      .not('wa_message_id', 'is', null)
      .in('status', [...SENT])
      .is('template_key', null)
      .is('media_mime', null)
      .is('interactive_payload', null)
      .gte('created_at', new Date(since).toISOString())
      .order('created_at', { ascending: true })
      .limit(20);
    if (error) throw fail('app send twins read', error.message);
    return data;
  }

  /**
   * One transaction (app_send_adopt, migration 20261106000601): the external row is deleted and
   * the held row takes its wamid, status and times, hold and window cleared; compare-and-set on
   * both. false = either moved. Then the delivery side effects, as any attach.
   */
  async adopt(held: HeldRow, externalId: string): Promise<boolean> {
    const args = { p_held: held.id, p_external: externalId };
    const { data, error } = await this.db.rpc('app_send_adopt', args);
    if (error) throw fail('app send adopt', error.message);
    if (!data) return false;
    const at = new Date().toISOString();
    await stampDelivered(this.db, { leadId: held.lead_id, dedupKey: held.dedup_key, at });
    return true;
  }
}
