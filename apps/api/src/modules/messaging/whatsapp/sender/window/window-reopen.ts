import type { TablesInsert } from '@ab/db';
import { AWAITING_REPLY, HOLD_EXPIRED, REOPEN_UNAVAILABLE, reopenDedupKey } from '@ab/shared';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import { SENDING } from '@/modules/messaging/whatsapp/sender/send-plan';

/** One reopen template per phone per 24 h: the pre-read's span, and the row's own life. */
export const DAY_MS = 24 * 60 * 60_000;

/**
 * The reopen template row for a held text's phone, as the staff member who wrote the text (not a
 * job's row: never auto_off). It expires after 24 h, so a template paused meanwhile never goes out
 * late and never blocks the next reopen. Deduped by `reopen:<E.164>:<Riyadh day>` (rule 8).
 */
export function reopenRow(row: DueMessage, key: string, now: Date): TablesInsert<'messages'> {
  return {
    direction: 'outbound',
    status: 'queued',
    phone_e164: row.phone_e164,
    lead_id: row.lead_id,
    guardian_id: row.guardian_id ?? null,
    created_by: row.created_by,
    template_key: key,
    template_params: {},
    dedup_key: reopenDedupKey(row.phone_e164, now),
    expires_at: new Date(now.getTime() + DAY_MS).toISOString(),
  };
}

/**
 * The error_code a hold's write expects (compare-and-set): AWAITING_REPLY on a due row the inbox
 * marked, SENDING after a claim WhatsApp refused. Another worker's move makes the write a no-op.
 */
export const expectedCode = (row: Pick<DueMessage, 'error_code'>): string =>
  row.error_code === AWAITING_REPLY ? AWAITING_REPLY : SENDING;

/** The hold's own refusals (failed for good, no try counted). */
export const UNAVAILABLE = {
  code: REOPEN_UNAVAILABLE,
  text: 'chat_reopen_template is not an approved chat-line starter template without variables',
};
export const EXPIRED = { code: HOLD_EXPIRED, text: 'the family did not reply within 7 days' };
