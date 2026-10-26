import type { Conflict } from '@ab/shared';
import type { Occurrence, RuleTiming } from '../../scheduling/occurrences/occurrences';
import { localDay, MINUTE, offsetMs, weekdayOf } from '../../../people/teachers/availability/zoned-time';
import { lessonRows, type BookingPayload } from '../core/booking.mapper';

type InstantPlan = { timing: RuleTiming; occurrence: Occurrence };

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * «حلقة فورية»: one lesson from now (rounded down to the minute) in a one-day rule, the same shape
 * as a trial or a makeup (docs/10 invariant 4): byday = today, start_time_local = this minute and
 * starts_on = ends_on = today, all in `tz`. The timing round-trips to the same instant, so the daily
 * generator (which only looks ahead of now anyway) finds the row already there (unique(rule_id, starts_at)).
 */
export function instantPlan(input: { now: Date; tz: string; durationMin: number }): InstantPlan {
  const start = Math.floor(input.now.getTime() / MINUTE) * MINUTE;
  const day = localDay(start, input.tz);
  const minutes = Math.round((start + offsetMs(start, input.tz) - day) / MINUTE);
  const date = new Date(day).toISOString().slice(0, 10);
  return {
    timing: {
      byday: [weekdayOf(day)],
      start_time_local: `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`,
      duration_min: input.durationMin,
      tz: input.tz,
      starts_on: date,
      ends_on: date,
    },
    occurrence: { starts_at: new Date(start), ends_at: new Date(start + input.durationMin * MINUTE) },
  };
}

type InstantPayloadInput = {
  plan: InstantPlan;
  teacherId: string;
  studentIds: string[];
  conflicts: Conflict[];
  reason: string | null;
  meetingLink: string | null;
  clientRequestId: string | null;
};

/**
 * The create_booking payload of an instant lesson: package null (like a makeup: it has no package
 * of its own), no lead, no new student, no invoice and no messages (nothing is sent to WhatsApp).
 * create_instant_lesson then flags the lesson instant and opens its room in the same transaction.
 */
export function instantPayload(input: InstantPayloadInput): BookingPayload {
  const { plan, reason, conflicts } = input;
  return {
    rule: {
      ...plan.timing,
      teacher_id: input.teacherId,
      meeting_link: null,
      package: null,
      client_request_id: input.clientRequestId,
    },
    student_ids: input.studentIds,
    lead: null,
    new_guardian: null,
    new_student: null,
    lessons: lessonRows({ occurrences: [plan.occurrence], conflicts, reason, meetingLink: input.meetingLink }),
    messages: [],
    makeup_of: null,
    invoice: null,
    audit: {
      after: { kind: 'instant', package: null, override_reason: reason, conflicts: conflicts.map((c) => ({ ...c })) },
    },
  };
}
