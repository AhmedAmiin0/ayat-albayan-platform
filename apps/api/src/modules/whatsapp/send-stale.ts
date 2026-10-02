import { FOLLOW_UP_STATUSES, followUpCycle, followUpKeyCycle, isLessonTimed, type LeadStatus, type LessonStatus } from '@ab/shared';

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

function followUpStale({ lead, dedup_key }: StaleInput): string | null {
  if (!lead) return 'lead deleted';
  if (lead.follow_up_paused) return 'follow-ups paused';
  if (!FOLLOW_UP.includes(lead.status)) return `lead ${lead.status}`;
  const cycle = followUpKeyCycle(dedup_key);
  return cycle !== null && cycle !== followUpCycle(lead) ? 'lead wrote again' : null;
}
