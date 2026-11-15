import { trialLength, type Duration, type TrialHistory } from '@ab/shared';
import { ruleFromSlot } from '@/booking/shared/slots';

/** What the trial-date wizard holds: the student, the family's zone, the length, the picks. */
export interface TrialDateDraft {
  studentId: string;
  /** The family's zone (history.family_tz): the slot's small clock and the rule's day. */
  tz: string;
  durationMin: Duration;
  /** Pre-selected as the last trial's teacher (history.items[0]); changeable. */
  teacher: { id: string; name: string } | null;
  startsAt: string | null;
  /** «رابط الحلقة» (owner 2026-11-02): typed on the review; empty = the teacher's own link. */
  meetingLink: string;
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
  meetingLink?: string;
}

export function trialDateDraft(history: TrialHistory): TrialDateDraft {
  return {
    studentId: history.student_id,
    tz: history.student_tz ?? history.family_tz, // as the web draft: the student's own zone first
    durationMin: trialLength(history), // the last trial's (shared), changeable on the slot step
    teacher: history.items[0]?.teacher ?? null,
    startsAt: null,
    meetingLink: '',
  };
}

/** The typed link, trimmed; nothing when empty (the teacher's link then). */
const linkOf = (link: string): { meetingLink?: string } => {
  const meetingLink = link.trim();
  return meetingLink ? { meetingLink } : {};
};

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
    ...linkOf(d.meetingLink),
  };
}
