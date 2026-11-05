import type { TablesInsert } from '@ab/db';
import { AWAITING_REPLY, HOLD_EXPIRED, REOPEN_FAILED, REOPEN_UNAVAILABLE } from '@ab/shared';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import { SENDING } from '@/modules/messaging/whatsapp/sender/send-plan';
import { DAY_MS } from './reopen-state';

/** The reopen row's template, its dedup key (nextReopenKey: one per try per day) and the time. */
interface ReopenAt {
  key: string;
  dedup: string;
  now: Date;
}

/**
 * The reopen template row for a held text's phone, as the staff member who wrote the text (not a
 * job's row: never auto_off). It expires after 24 h, so a template paused meanwhile never goes out
 * late and never blocks the next reopen. Deduped per phone, day and try (rule 8).
 */
export function reopenRow(row: DueMessage, at: ReopenAt): TablesInsert<'messages'> {
  return {
    direction: 'outbound',
    status: 'queued',
    phone_e164: row.phone_e164,
    lead_id: row.lead_id,
    guardian_id: row.guardian_id ?? null,
    created_by: row.created_by,
    template_key: at.key,
    template_params: {},
    dedup_key: at.dedup,
    expires_at: new Date(at.now.getTime() + DAY_MS).toISOString(),
  };
}

/**
 * The error_code a hold's write expects (compare-and-set): AWAITING_REPLY on a due row the inbox
 * marked, SENDING after a claim WhatsApp refused. Another worker's move makes the write a no-op.
 */
export const expectedCode = (row: Pick<DueMessage, 'error_code'>): string =>
  row.error_code === AWAITING_REPLY ? AWAITING_REPLY : SENDING;

type CheckedRow = Pick<DueMessage, 'error_code' | 'created_at'>;

/**
 * When the window was last seen closed, the hold's start (a family reply after it releases the
 * text, even one landing before the hold is written): the inbox's enqueue (created_at, within the
 * last 24 h) for a row it marked; this pass for a row WhatsApp refused just now.
 */
export function checkedAt(row: CheckedRow, now: Date): Date {
  const enqueued = Date.parse(row.created_at ?? now.toISOString());
  const marked = Math.max(enqueued, now.getTime() - DAY_MS);
  return new Date(row.error_code === AWAITING_REPLY ? marked : now.getTime());
}

/** A hold's refusal: failed for good, no try counted. */
export interface FailWhy {
  code: string;
  text: string;
}

export const UNAVAILABLE: FailWhy = {
  code: REOPEN_UNAVAILABLE,
  text: 'chat_reopen_template is not an approved chat-line starter template without variables',
};
export const EXPIRED: FailWhy = { code: HOLD_EXPIRED, text: 'the family did not reply within 7 days' };
/** Today's reopen tries all failed or expired unsent: nothing more is sent today. */
export const TRIES_USED: FailWhy = {
  code: REOPEN_FAILED,
  text: "today's reopen template tries all failed or expired unsent",
};
/** A held text whose reopen template failed or expired unsent: failed now, staff may resend. */
export const LOST: FailWhy = {
  code: REOPEN_FAILED,
  text: 'the reopen template failed or expired unsent, so no reply was asked for',
};
