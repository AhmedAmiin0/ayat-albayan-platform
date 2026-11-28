import {
  FOLLOW_UP_STATUSES,
  followUpCycle,
  followUpKeyCycle,
  isLessonTimed,
  messageExpired,
} from '@ab/shared';
import type { LeadStatus, LessonStatus } from '@ab/catalog';
import { isStaffAlert, staffStale, type StaffAtSend } from '@/modules/messaging/reminders';

export { AUTO_OFF, AUTOMATIC_KEYS, isAutomatic } from './plan/automatic';

// Send-time check of a queued row (docs/12 §3.3): rows wait in the queue while the send gate is
// closed (until cut-over, after a kill-switch OFF), so what was right to queue may be wrong to
// send.

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
 * - a booking confirmation / reminder / classroom link whose lesson was cancelled or moved
 *   (rescheduling makes a new lesson with its own confirmation);
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

/** The new-student alert, also when it goes as teacher_lesson_v3 (its dedup key names it). */
const isNewStudentAlert = (row: { template_key: string | null; dedup_key: string | null }) =>
  row.template_key === 'teacher_new_student' ||
  (row.dedup_key ?? '').startsWith('teacher_new_student:');

/** Dropped when the lesson moved or is no longer open, since it would announce the old time. */
function newStudentRetimed(row: {
  template_key: string | null;
  dedup_key: string | null;
  expires_at: string | null;
  lesson: { starts_at: string; status: LessonStatus } | null;
}): boolean {
  if (!isNewStudentAlert(row) || !row.lesson) return false;
  if (!OPEN_LESSON.includes(row.lesson.status)) return true;
  return !!row.expires_at && Date.parse(row.expires_at) !== Date.parse(row.lesson.starts_at);
}

/**
 * What dropReason reads: a staff alert also carries its teacher as found at send time
 * (staffAtSend).
 */
export type DropInput = StaleInput & {
  expires_at: string | null;
  lesson: { starts_at: string; status: LessonStatus } | null;
  phone_e164?: string;
  staff?: readonly StaffAtSend[];
};

type Drop = { code: 'expired' | 'stale'; text: string } | null;
type DropRule = (row: DropInput, now: Date) => Drop;

const expired: DropRule = (row, now) => {
  const lessonStartsAt = row.lesson?.starts_at ?? null;
  const input = { templateKey: row.template_key, expiresAt: row.expires_at, lessonStartsAt, now };
  return messageExpired(input) ? { code: 'expired', text: 'expired before it was sent' } : null;
};

const staffGone: DropRule = (row) => {
  const found = row.staff && isStaffAlert(row.template_key) ? row.staff : null;
  const text = found ? staffStale(found, row.phone_e164 ?? '') : null;
  return text ? { code: 'stale', text } : null;
};

const retimed: DropRule = (row) =>
  newStudentRetimed(row) ? { code: 'stale', text: 'lesson retimed' } : null;

const stale: DropRule = (row) => {
  const text = staleReason(row);
  return text ? { code: 'stale', text } : null;
};

/** First match wins: expired, then a staff alert's teacher, a retimed lesson, stale (above). */
const DROP_RULES: readonly DropRule[] = [expired, staffGone, retimed, stale];

/**
 * A queued row the worker drops before claiming it: past its send window, a staff alert whose
 * teacher may no longer hear from the academy (staffStale), or stale (above).
 */
export function dropReason(row: DropInput, now: Date): Drop {
  return DROP_RULES.reduce<Drop>((found, rule) => found ?? rule(row, now), null);
}

function followUpStale({ lead, dedup_key }: StaleInput): string | null {
  if (!lead) return 'lead deleted';
  if (lead.follow_up_paused) return 'follow-ups paused';
  if (!FOLLOW_UP.includes(lead.status)) return `lead ${lead.status}`;
  const cycle = followUpKeyCycle(dedup_key);
  return cycle !== null && cycle !== followUpCycle(lead) ? 'lead wrote again' : null;
}
