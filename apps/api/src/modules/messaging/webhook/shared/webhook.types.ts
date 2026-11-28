import type { TablesUpdate } from '@ab/db';
import type { MessageStatus } from '@ab/catalog';
import type { LineNumbers } from '@/config/env/env';
import type { ReceivingNumber } from '@/modules/messaging/webhook/lines/webhook.lines';

/** Who a phone is. Each is matched by phone_e164 (unique on all three tables). */
export interface Contact {
  guardian: { id: string; name: string } | null;
  teacher: { id: string; name: string } | null;
  lead: { id: string; name: string | null; follow_up_stage: number } | null;
}

/** The outbound row a status or a reply refers to (by Meta's wamid). */
export interface OutboundRow {
  id: string;
  status: MessageStatus;
  phone_e164: string;
  lesson_id: string | null;
  template_key: string | null;
  body: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  /**
   * The sender's tries; 0 = never sent by us (a message sent outside the app, or imported history).
   */
  attempts: number;
  guardians: { name: string } | null;
  leads: { name: string | null } | null;
}

export interface StatusMove {
  id: string;
  /** Compare-and-set: only when the row still has this status. */
  from: MessageStatus;
  patch: TablesUpdate<'messages'>;
}

/** The lesson message a typed reply may answer: to this phone, after `since`, up to `until`. */
export interface ReplyWindow {
  phone: string;
  since: Date;
  until: Date;
}

/** WhatsApp webhook settings from env (docs/12 §3.1, §13.6), provided as WEBHOOK_CONFIG. */
export interface WebhookConfig {
  /**
   * [WA_APP_SECRET, WA_CHAT_APP_SECRET]: X-Hub-Signature-256 keys, any may match. None → every POST
   * is 401.
   */
  appSecrets: readonly string[];
  /** WA_VERIFY_TOKEN: GET subscribe handshake (one token for both Meta apps). Unset → 403. */
  verifyToken: string | undefined;
  /** Each line's phone-number id: changes for any other number are ignored. */
  numbers: LineNumbers;
  /** KAPSO_WEBHOOK_SECRET: POST /webhooks/kapso only (docs/19). Unset → every Kapso POST is 401. */
  kapsoSecret?: string;
  /**
   * WACRM_WEBHOOK_SECRET: POST /webhooks/wacrm only (docs/19 «crm driver»). Unset → every CRM POST
   * is 401.
   */
  wacrmSecret?: string;
  /**
   * Module mode (docs/23c decision 7): every wa_numbers row, enabled or not; absent / null = legacy
   * (`numbers`).
   */
  overlay?: readonly ReceivingNumber[] | null;
  /** The dedicated calls number (docs/28 §10), read per access; null / absent = none. */
  calls?: ReceivingNumber | null;
}
