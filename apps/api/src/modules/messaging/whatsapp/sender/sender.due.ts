import type { Json } from '@ab/db';
import type { LessonStatus, WaLine } from '@ab/shared';
import type { Db } from '@/common/db/db.module';
import type { StaleLead } from './send-stale';

/** A queued outbound row with what expiry, staleness and the failure push need. */
export interface DueMessage {
  id: string;
  phone_e164: string;
  lead_id: string | null;
  lesson_id: string | null;
  template_key: string | null;
  template_params: Json | null;
  body: string | null;
  reply_to_wa_id: string | null;
  dedup_key: string | null;
  /** The admin who wrote it from the inbox; null for rows the jobs queued (isAutomatic). */
  created_by: string | null;
  attempts: number;
  expires_at: string | null;
  /** Queued at / due at: the payment hold's backoff (hold/payment-hold); optional for fixtures. */
  created_at?: string;
  scheduled_for?: string | null;
  /** SENDING = a previous try was claimed and never resolved (send-plan). */
  error_code: string | null;
  /** The line a session text leaves from (docs/12 §13.3); null = notifications. Templates ignore it. */
  line: WaLine | null;
  /** The number a session text was stamped with at enqueue (module mode, docs/23c decision 5); null = its line's default. */
  number_id: string | null;
  /** A file staff sent from the chat (wa-media out/…; owner 2026-10-19 #2); optional so older fixtures compile. */
  media_path?: string | null;
  media_mime?: string | null;
  media_name?: string | null;
  /** «اطلب إذن الاتصال» (docs/28): the interactive marker; optional so older fixtures compile. */
  interactive_payload?: Json | null;
  lesson: { starts_at: string; status: LessonStatus } | null;
  guardian: { name: string } | null;
  lead: (StaleLead & { name: string | null }) | null;
}

export const DUE_COLUMNS =
  'id, phone_e164, lead_id, lesson_id, template_key, template_params, body, reply_to_wa_id, dedup_key, created_by, attempts, expires_at, created_at, scheduled_for, error_code, line, number_id, media_path, media_mime, media_name, interactive_payload, lesson:lessons(starts_at, status), guardian:guardians(name), lead:leads(name, status, follow_up_paused, last_inbound_at, created_at)';

/**
 * The idle tick's one read (messages_queue_idx): is any queued outbound row due now (in the allow-list
 * when one is set)? A superset of SenderQueries.due() (any template, any line), so false never skips
 * a row due() would have read; true runs the pass exactly as before.
 */
export async function anyDue(db: Db, input: { now: Date; allowed: readonly string[] | null }): Promise<boolean> {
  const now = input.now.toISOString();
  const queued = db
    .from('messages')
    .select('id')
    .eq('direction', 'outbound')
    .eq('status', 'queued')
    .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`);
  const { data, error } = await (input.allowed ? queued.in('phone_e164', [...input.allowed]) : queued).limit(1);
  if (error) throw new Error(`outbound queue probe failed: ${error.message}`);
  return data.length > 0;
}
