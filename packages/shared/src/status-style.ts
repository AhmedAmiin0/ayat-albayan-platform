import type {
  Attendance,
  Grade,
  JobApplicantStatus,
  LeadStatus,
  LessonStatus,
  ScheduleRuleStatus,
  StudentStatus,
  SubscriptionStatus,
  TeacherStatus,
} from './enums/index.js';

// Status → visual grammar (docs/07 §6). Labels come from ar.json `enums.*`; this map is shape only.
// Tone: act = admin must do something now («دورك»), bad = didn't happen through someone's fault,
// ok = settled and good, neutral = informational / waiting on someone else / closed.
// Glyph: fill = settled, half = underway, hollow = waiting, struck = stopped or cancelled.

export type Tone = 'ok' | 'act' | 'bad' | 'neutral';
export type Glyph = 'fill' | 'half' | 'hollow' | 'struck';
export interface StatusStyle {
  tone: Tone;
  glyph: Glyph;
}
/** Grades are ordinal: 1..5 pips, filled first, so they read in greyscale print. */
export interface GradeStyle {
  tone: Tone;
  pips: 1 | 2 | 3 | 4 | 5;
}

export const lessonStatusStyle: Record<LessonStatus, StatusStyle> = {
  scheduled: { tone: 'act', glyph: 'hollow' },
  confirmed: { tone: 'ok', glyph: 'fill' },
  completed: { tone: 'neutral', glyph: 'fill' },
  late: { tone: 'bad', glyph: 'half' },
  excused: { tone: 'neutral', glyph: 'struck' },
  no_show: { tone: 'bad', glyph: 'struck' },
  cancelled_by_teacher: { tone: 'bad', glyph: 'struck' },
  cancelled_by_admin: { tone: 'neutral', glyph: 'struck' },
  rescheduled: { tone: 'neutral', glyph: 'half' },
};

export const leadStatusStyle: Record<LeadStatus, StatusStyle> = {
  new: { tone: 'act', glyph: 'hollow' },
  contacted: { tone: 'neutral', glyph: 'half' },
  interested_no_slot: { tone: 'neutral', glyph: 'hollow' },
  trial_booked: { tone: 'ok', glyph: 'hollow' },
  trial_done: { tone: 'ok', glyph: 'half' },
  converted: { tone: 'ok', glyph: 'fill' },
  no_reply: { tone: 'neutral', glyph: 'hollow' },
  lost: { tone: 'neutral', glyph: 'struck' },
};

export const studentStatusStyle: Record<StudentStatus, StatusStyle> = {
  trial: { tone: 'neutral', glyph: 'hollow' },
  active: { tone: 'ok', glyph: 'fill' },
  paused: { tone: 'neutral', glyph: 'half' },
  churned: { tone: 'neutral', glyph: 'struck' },
};

export const subscriptionStatusStyle: Record<SubscriptionStatus, StatusStyle> = {
  trial: { tone: 'neutral', glyph: 'hollow' },
  active: { tone: 'ok', glyph: 'fill' },
  paused: { tone: 'neutral', glyph: 'half' },
  expired: { tone: 'act', glyph: 'struck' },
  unpaid: { tone: 'act', glyph: 'hollow' },
};

export const attendanceStyle: Record<Attendance, StatusStyle> = {
  on_time: { tone: 'ok', glyph: 'fill' },
  late: { tone: 'bad', glyph: 'half' },
  excused: { tone: 'neutral', glyph: 'struck' },
  absent: { tone: 'bad', glyph: 'struck' },
};

export const teacherStatusStyle: Record<TeacherStatus, StatusStyle> = {
  active: { tone: 'ok', glyph: 'fill' },
  inactive: { tone: 'neutral', glyph: 'struck' },
};

/** A new applicant is neutral: hiring is not a «دورك» moment. `interview` mirrors `trial_booked`. */
export const jobApplicantStatusStyle: Record<JobApplicantStatus, StatusStyle> = {
  new: { tone: 'neutral', glyph: 'hollow' },
  reviewing: { tone: 'neutral', glyph: 'half' },
  interview: { tone: 'ok', glyph: 'hollow' },
  accepted: { tone: 'ok', glyph: 'fill' },
  rejected: { tone: 'neutral', glyph: 'struck' },
};

/** A paused series waits on the family; an ended one is closed. R-SCH-02. */
export const scheduleRuleStatusStyle: Record<ScheduleRuleStatus, StatusStyle> = {
  active: { tone: 'ok', glyph: 'fill' },
  paused: { tone: 'neutral', glyph: 'half' },
  ended: { tone: 'neutral', glyph: 'struck' },
};

export const gradeStyle: Record<Grade, GradeStyle> = {
  excellent: { tone: 'ok', pips: 5 },
  very_good: { tone: 'ok', pips: 4 },
  good: { tone: 'neutral', pips: 3 },
  acceptable: { tone: 'neutral', pips: 2 },
  needs_review: { tone: 'act', pips: 1 },
};

// TODO(R-SUB-02): packageProgress(used, total) → «فاضل حلقتين» etc. lands with subscriptions (Phase 3).
