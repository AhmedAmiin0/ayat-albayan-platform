import type { Tables } from '@ab/db';
import {
  replyLine,
  searchDigits,
  sessionWindowOpen,
  type BodySlot,
  type TemplateParamsInput,
  type TemplateView,
  type ThreadView,
  type WaLine,
} from '@ab/shared';
import { lineEnvs, loadEnv } from '../../env';
import { orSafe } from '../guardians/http';
import type { FamilyTag } from './thread-people.mapper';

export type ThreadRow = Tables<'v_threads'>;

/**
 * v_threads row → ThreadView (H1/H2). The view's columns are typed nullable, but a thread only
 * exists for a phone with at least one message, so the last-message fields are always set.
 * The family tags come from the guardian's students (ThreadsQueries.familyTags / people); a
 * guardian without students is «مش مشترك», a row without a guardian has no badge.
 */
export function toThreadView(row: ThreadRow, now: Date, tag: FamilyTag | null = null): ThreadView {
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
    last_inbound_line: row.last_inbound_line,
    last_chat_inbound_at: row.last_chat_inbound_at,
    last_notifications_inbound_at: row.last_notifications_inbound_at,
    reply_line: shownReplyLine(row, now),
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
    ...familyFields(row.guardian_id ? (tag ?? { badge: 'none', unpaid: false }) : null),
  };
}

/** replyLine() over the view's two per-line windows (docs/12 §13.3 rule 2). */
export function threadReplyLine(row: ThreadRow, opts: { chatConfigured: boolean; now: Date }): WaLine | null {
  const { last_chat_inbound_at: lastChatInboundAt, last_notifications_inbound_at: lastNotificationsInboundAt } = row;
  return replyLine({ lastChatInboundAt, lastNotificationsInboundAt, ...opts });
}

/**
 * The «replying from» line (13.10): the line ThreadSendService.text stamps, so null on a single
 * line (no note, as before two lines) and 'chat' when only the chat window is open but its line
 * cannot send (the reply answers 503).
 */
function shownReplyLine(row: ThreadRow, now: Date): WaLine | null {
  const chatConfigured = Boolean(lineEnvs(loadEnv()).chat);
  const line = threadReplyLine(row, { chatConfigured, now });
  return chatConfigured || line === 'chat' ? line : null;
}

/** A guardian's tags («مش مشترك» without students); none for a lead, a teacher or a stranger. */
function familyFields(tag: FamilyTag | null): Pick<ThreadView, 'subscribed' | 'badge' | 'unpaid'> {
  return { subscribed: tag?.badge === 'subscribed', badge: tag?.badge ?? null, unpaid: tag?.unpaid ?? false };
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
  const missing = template.params.map((_, i) => String(i + 1)).filter((k) => !params[k as BodySlot]);
  const needsButton = template.buttons.some((b) => b.type === 'url' && b.url.includes('{{1}}'));
  return needsButton && !params.button ? [...missing, 'button'] : missing;
}
