import type { Json } from '@ab/db';
import type { LessonStatus, WaLine } from '@ab/shared';
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
  lesson: { starts_at: string; status: LessonStatus } | null;
  guardian: { name: string } | null;
  lead: (StaleLead & { name: string | null }) | null;
}

export const DUE_COLUMNS =
  'id, phone_e164, lead_id, lesson_id, template_key, template_params, body, reply_to_wa_id, dedup_key, created_by, attempts, expires_at, error_code, line, number_id, media_path, media_mime, media_name, lesson:lessons(starts_at, status), guardian:guardians(name), lead:leads(name, status, follow_up_paused, last_inbound_at, created_at)';
