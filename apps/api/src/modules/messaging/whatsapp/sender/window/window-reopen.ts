import type { TablesInsert } from '@ab/db';
import type { WaLine } from '@ab/shared';
import {
  AWAITING_REPLY,
  HOLD_EXPIRED,
  REOPEN_FAILED,
  REOPEN_TRIES_USED,
  REOPEN_UNAVAILABLE,
} from '@ab/shared';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import { SENDING } from '@/modules/messaging/whatsapp/sender/send-plan';
import { templateStamp } from '@/modules/messaging/whatsapp/sender/send-line';
import { DAY_MS } from './reopen-state';
import { HOLD_MS } from './window-rules';

/** The reopen row's template, its dedup key (nextReopenKey: one per try per day) and the time. */
interface ReopenAt {
  key: string;
  /** The template's registry line (reopenUsable: always chat); absent = chat. */
  line?: WaLine;
  dedup: string;
  now: Date;
}

/**
 * The reopen template row for a held text's phone, as the staff member who wrote the text (not a
 * job's row: never auto_off). It expires after 24 h, so a template paused meanwhile never goes out
 * late and never blocks the next reopen. Deduped per phone, day and try (rule 8). Stamped with the
 * chat line (templateStamp), so the chat lane's pass that held the text sends it (docs/42 42-7).
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
    ...templateStamp({ line: at.line ?? 'chat' }),
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
/** Today's reopen tries all failed or expired unsent: nothing more today, staff try tomorrow. */
export const TRIES_USED: FailWhy = {
  code: REOPEN_TRIES_USED,
  text: "today's reopen template tries all failed or expired unsent: send it again tomorrow",
};
/** A held text whose reopen template failed or expired unsent: failed now, staff may resend. */
export const LOST: FailWhy = {
  code: REOPEN_FAILED,
  text: 'the reopen template failed or expired unsent, so no reply was asked for',
};

/**
 * A held text's error_text under «بدون قالب» (owner 2026-11-06): no reopen template was asked for,
 * so the release never fails it as orphaned (window-release); the family's next message sends it.
 */
export const NO_TEMPLATE_NOTE = 'held without a reopen template: waiting for the family to write';

/** Held under «بدون قالب»: error_text starts with NO_TEMPLATE_NOTE (a Kapso note may follow). */
export const heldWithoutTemplate = (errorText: string | null): boolean =>
  errorText?.startsWith(NO_TEMPLATE_NOTE) ?? false;

/** What a hold does: fail now (fail), or hold with this error_text (null: a template asks). */
export interface HoldPlan {
  fail?: FailWhy;
  note: string | null;
  /** The dedup key of the reopen row this plan queued (dropped if the hold then misses). */
  queued?: string;
}

type DeadlineRow = Pick<DueMessage, 'created_at' | 'scheduled_for' | 'expires_at'>;

/**
 * A hold's deadline: one it already had (a released text refused again keeps it), else 7 days
 * from the later of when it was written and when it was (re)queued for (scheduled_for: a staff
 * retry clears the deadline and restarts it, owner 2026-11-06).
 */
export function holdDeadline(row: DeadlineRow, now: Date): Date {
  const written = Date.parse(row.created_at ?? now.toISOString());
  const requeued = row.scheduled_for ? Date.parse(row.scheduled_for) : written;
  const kept = row.expires_at ? Date.parse(row.expires_at) : null;
  return new Date(kept ?? Math.max(written, requeued) + HOLD_MS);
}
