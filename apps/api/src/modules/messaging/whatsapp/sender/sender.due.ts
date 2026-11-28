import type { Json } from '@ab/db';
import type { LessonStatus, WaLine } from '@ab/catalog';
import type { StaleLead } from './send-stale';
import type { SentFile, WaSent } from '@/modules/messaging/whatsapp/whatsapp.types';

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
  /** A teacher's own send (docs/19): never held behind the reopen template; optional. */
  sent_by_teacher_id?: string | null;
  guardian_id?: string | null;
  attempts: number;
  expires_at: string | null;
  /** Queued at / due at: the payment hold's backoff (hold/payment-hold); optional for fixtures. */
  created_at?: string;
  scheduled_for?: string | null;
  /** SENDING = a previous try was claimed and never resolved (send-plan). */
  error_code: string | null;
  /**
   * The line a session text leaves from (docs/12 §13.3); null = notifications. Templates ignore it.
   */
  line: WaLine | null;
  /**
   * The number a session text was stamped with at enqueue (module mode, docs/23c decision 5); null
   * = its line's default.
   */
  number_id: string | null;
  /** A file staff sent from the chat (wa-media out/…); optional so older fixtures compile. */
  media_path?: string | null;
  media_mime?: string | null;
  media_name?: string | null;
  /** Optional so older fixtures compile (docs/28). */
  interactive_payload?: Json | null;
  lesson: { starts_at: string; status: LessonStatus } | null;
  guardian: { name: string } | null;
  lead: (StaleLead & { name: string | null }) | null;
}

export const DUE_COLUMNS =
  'id, phone_e164, lead_id, lesson_id, template_key, template_params, body, reply_to_wa_id, dedup_key, created_by, sent_by_teacher_id, guardian_id, attempts, expires_at, created_at, scheduled_for, error_code, line, number_id, media_path, media_mime, media_name, interactive_payload, lesson:lessons(starts_at, status), guardian:guardians(name), lead:leads(name, status, follow_up_paused, last_inbound_at, created_at)';

/** docs/19: the platform never sends a row staff may have sent from the app; nothing clears it. */
export const NOT_APP_SENT = 'app_send_until.is.null';

/** What a send adds to the sent row: Evolution's text-for-a-template, a refused note's m4a. */
export const sentExtras = (sent: WaSent): { sent_as_text?: true } & Partial<SentFile> => ({
  ...(sent.asText ? { sent_as_text: true } : {}),
  ...sent.media,
});
