import type { Tables } from '@ab/db';
import { searchDigits, sessionWindowOpen, type TemplateParamsInput, type TemplateView, type ThreadView } from '@ab/shared';
import { orSafe } from '../guardians/http';

export type ThreadRow = Tables<'v_threads'>;

/**
 * v_threads row → ThreadView (H1/H2). The view's columns are typed nullable, but a thread only
 * exists for a phone with at least one message, so the last-message fields are always set.
 * `subscribed` comes from the guardian's students (ThreadsQueries.subscribedGuardians / people).
 */
export function toThreadView(row: ThreadRow, now: Date, subscribed = false): ThreadView {
  return {
    phone_e164: row.phone_e164 ?? '',
    display_name: row.display_name,
    last_message_id: row.last_message_id ?? '',
    last_direction: row.last_direction ?? 'inbound',
    last_body: row.last_body,
    last_template_key: row.last_template_key,
    last_status: row.last_status ?? 'delivered',
    last_media_mime: row.last_media_mime,
    last_message_at: row.last_message_at ?? '',
    last_inbound_at: row.last_inbound_at,
    unread_count: row.unread_count ?? 0,
    lead_id: row.lead_id,
    lead_name: row.lead_name,
    lead_status: row.lead_status,
    lead_source: row.lead_source,
    guardian_id: row.guardian_id,
    guardian_name: row.guardian_name,
    guardian_tz: row.guardian_tz,
    teacher_id: row.teacher_id,
    teacher_name: row.teacher_name,
    session_open: sessionWindowOpen(row.last_inbound_at, now),
    subscribed,
  };
}

/** H1 search: a phone in any format → its digits; else the display name. */
export function threadSearchFilter(term: string): string | null {
  const digits = searchDigits(term);
  if (digits) return `phone_e164.ilike.*${digits}*`;
  const safe = orSafe(term);
  return safe ? `display_name.ilike.*${safe}*` : null;
}

/**
 * H4: what the admin left empty. Every {{n}} of the template is required, and the URL button's
 * suffix when its url has a {{1}} (the meeting code). Names are the TemplateParams keys.
 */
export function missingParams(template: TemplateView, params: TemplateParamsInput): string[] {
  const missing = template.params.map((_, i) => String(i + 1)).filter((k) => !params[k as '1' | '2' | '3']);
  const needsButton = template.buttons.some((b) => b.type === 'url' && b.url.includes('{{1}}'));
  return needsButton && !params.button ? [...missing, 'button'] : missing;
}
