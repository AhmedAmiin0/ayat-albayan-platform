import { DURATIONS, type Duration, type TrialHistory } from '@ab/shared';
import { DEFAULT_MINUTES } from '@/booking/package-choice';
import { ruleFromSlot } from '@/booking/slots';

/** What the trial-date wizard holds: the student, the family's zone, the length, the picks. */
export interface TrialDateDraft {
  studentId: string;
  /** The family's zone (history.family_tz): the slot's small clock and the rule's day. */
  tz: string;
  durationMin: Duration;
  /** Pre-selected as the last trial's teacher (history.items[0]); changeable. */
  teacher: { id: string; name: string } | null;
  startsAt: string | null;
}

/** POST {base}/trial-date (and /check): a normal one-lesson trial booking of the one student. */
export interface TrialDateBody {
  studentIds: [string];
  kind: 'trial';
  package: 'trial';
  teacherId: string;
  byday: number[];
  startTimeLocal: string;
  tz: string;
  durationMin: number;
  startsOn: string;
  startsAt: string;
  clientRequestId: string;
}

/** The last trial's length when the slots API offers it (30/45/60/90), else the booking's 45. */
export function trialLength(history: TrialHistory): Duration {
  const last = history.items[0];
  if (!last) return DEFAULT_MINUTES;
  const min = Math.round((Date.parse(last.ends_at) - Date.parse(last.starts_at)) / 60_000);
  return DURATIONS.find((d) => d === min) ?? DEFAULT_MINUTES;
}

export function trialDateDraft(history: TrialHistory): TrialDateDraft {
  return {
    studentId: history.student_id,
    tz: history.family_tz,
    durationMin: trialLength(history),
    teacher: history.items[0]?.teacher ?? null,
    startsAt: null,
  };
}

/** The body once a teacher and a time are picked: one lesson on the slot's local day (invariant 4). */
export function trialDateBody(d: TrialDateDraft, requestId: string): TrialDateBody | null {
  if (!d.teacher || !d.startsAt) return null;
  const rule = ruleFromSlot(d.startsAt, d.tz);
  return {
    studentIds: [d.studentId],
    kind: 'trial',
    package: 'trial',
    teacherId: d.teacher.id,
    byday: [rule.weekday],
    startTimeLocal: rule.startTimeLocal,
    tz: d.tz,
    durationMin: d.durationMin,
    startsOn: rule.startsOn,
    startsAt: d.startsAt,
    clientRequestId: requestId,
  };
}
