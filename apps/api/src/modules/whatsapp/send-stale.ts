import {
  FOLLOW_UP_STATUSES,
  followUpCycle,
  followUpKeyCycle,
  isLessonTimed,
  messageExpired,
  type LeadStatus,
  type LessonStatus,
  type TemplateKey,
} from '@ab/shared';
import { REMINDER_KEYS } from '../reminders/reminders.queries';

// Send-time check of a queued row (docs/12 §3.3): rows wait in the queue while the send gate is
// closed (until cut-over, after a kill-switch OFF), so what was right to queue may be wrong to send.

/** The lead columns the check reads (sender.queries DUE_COLUMNS). */
export interface StaleLead {
  status: LeadStatus;
  follow_up_paused: boolean;
  last_inbound_at: string | null;
  created_at: string;
}

export interface StaleInput {
  template_key: string | null;
  dedup_key: string | null;
  lesson_id: string | null;
  lead_id: string | null;
  lesson: { status: LessonStatus } | null;
  lead: StaleLead | null;
}

const OPEN_LESSON: readonly LessonStatus[] = ['scheduled', 'confirmed'];
const FOLLOW_UP: readonly string[] = FOLLOW_UP_STATUSES;

/**
 * Why this row must not go out any more, or null:
 * - a booking confirmation / reminder whose lesson was cancelled or moved (rescheduling makes a
 *   new lesson with its own confirmation);
 * - a follow-up to a lead who paused (or asked to stop), moved out of the follow-up statuses,
 *   or wrote again since it was queued (a new silence gets its own follow-up).
 * report_ready, renewal_due and admin texts are not lesson-timed and pass (renewal_due rows are
 * failed when the renewal task closes, AlertsQueries.closeTasks).
 */
export function staleReason(row: StaleInput): string | null {
  if (isLessonTimed(row.template_key) && row.lesson && !OPEN_LESSON.includes(row.lesson.status)) {
    return `lesson ${row.lesson.status}`;
  }
  return row.template_key === 'follow_up_slots' && row.lead_id ? followUpStale(row) : null;
}

/** A queued row the worker drops before claiming it: past its send window, or stale (above). */
export function dropReason(
  row: StaleInput & { expires_at: string | null; lesson: { starts_at: string } | null },
  now: Date,
): { code: 'expired' | 'stale'; text: string } | null {
  const lessonStartsAt = row.lesson?.starts_at ?? null;
  if (messageExpired({ templateKey: row.template_key, expiresAt: row.expires_at, lessonStartsAt, now })) {
    return { code: 'expired', text: 'expired before it was sent' };
  }
  const stale = staleReason(row);
  return stale ? { code: 'stale', text: stale } : null;
}

function followUpStale({ lead, dedup_key }: StaleInput): string | null {
  if (!lead) return 'lead deleted';
  if (lead.follow_up_paused) return 'follow-ups paused';
  if (!FOLLOW_UP.includes(lead.status)) return `lead ${lead.status}`;
  const cycle = followUpKeyCycle(dedup_key);
  return cycle !== null && cycle !== followUpCycle(lead) ? 'lead wrote again' : null;
}

/**
 * What the jobs queue on their own: reminders, follow-ups and renewal reminders (migration 162).
 * Every other TEMPLATE_KEYS key goes out because someone acted: a booking, a submitted report
 * (message.worker.auto.test checks the split).
 */
export const AUTOMATIC_KEYS: readonly TemplateKey[] = [...REMINDER_KEYS, 'follow_up_slots', 'renewal_due'];
const AUTOMATIC: ReadonlySet<string> = new Set(AUTOMATIC_KEYS);

/** The hold of an automatic row while the switch is OFF (failed, no push). */
export const AUTO_OFF = { code: 'auto_off', text: 'automatic messages are off in settings' } as const;

/**
 * A job-made row of an automatic kind, held (failed 'auto_off') while settings.auto_messages_enabled
 * is OFF. created_by tells them apart: the jobs leave it null; an admin's inbox send of the same
 * template carries the admin (ThreadSendService) and goes. Booking confirmations and report_ready
 * are never automatic here.
 */
export function isAutomatic(row: { template_key: string | null; created_by: string | null }): boolean {
  return row.created_by === null && AUTOMATIC.has(row.template_key ?? '');
}
