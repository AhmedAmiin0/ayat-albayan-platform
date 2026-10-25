import {
  canPickTrialDate,
  trialOutcome,
  upcomingTrial,
  type Attendance,
  type LessonStatus,
  type PackageSize,
  type TrialDateRow,
  type TrialHistory,
} from '@ab/shared';
import { isTrialLesson } from '../../subscriptions/student-trial.plan';
import type { TrialStudent } from './trial-date.queries';

// «مواعيد الحلقة التجريبية» (owner 2026-10-25): every trial time picked for a student, newest pick
// first, with what became of it. Pure: TrialDateQueries reads, this shapes.

export interface TrialLessonRead {
  student_id: string;
  attendance: Attendance | null;
  chargeable: boolean;
  lesson: {
    id: string;
    rule_id: string | null;
    teacher_id: string;
    starts_at: string;
    ends_at: string;
    status: LessonStatus;
    created_at: string;
    created_by: string | null;
    rescheduled_from_id: string | null;
    instant: boolean;
    makeup_of_id: string | null;
    rule: { package: PackageSize | null } | null;
    teacher: { id: string; display_name_ar: string; display_name_en: string | null } | null;
  } | null;
}

export type TrialLesson = NonNullable<TrialLessonRead['lesson']> & { attendance: Attendance | null };

const iso = (t: string) => new Date(t).toISOString();

/** The student's trial lessons, each once (the two reads can overlap), newest pick first. */
export function trialLessonsOf(rows: readonly TrialLessonRead[]): TrialLesson[] {
  const byId = new Map<string, TrialLesson>();
  for (const { lesson, attendance, chargeable } of rows) {
    if (!lesson || !isTrialLesson(lesson, chargeable)) continue;
    byId.set(lesson.id, { ...lesson, attendance });
  }
  const at = (l: TrialLesson) => Date.parse(l.created_at);
  return [...byId.values()].sort((a, b) => at(b) - at(a) || Date.parse(b.starts_at) - Date.parse(a.starts_at));
}

export interface HistoryInput {
  student: TrialStudent;
  lessons: readonly TrialLesson[];
  /** profiles.full_name by id (who picked each date). */
  names: ReadonlyMap<string, string>;
  now: Date;
}

function rowOf(l: TrialLesson, input: HistoryInput): TrialDateRow {
  return {
    lesson_id: l.id,
    starts_at: iso(l.starts_at),
    ends_at: iso(l.ends_at),
    teacher: l.teacher ? { id: l.teacher.id, name: l.teacher.display_name_ar } : null,
    outcome: trialOutcome({ status: l.status, attendance: l.attendance, starts_at: l.starts_at, now: input.now }),
    picked_by: l.created_by ? (input.names.get(l.created_by) ?? null) : null,
    picked_at: iso(l.created_at),
    moved_from_id: l.rescheduled_from_id,
  };
}

/** GET {base}/trial-dates: the rows, the count, and whether a new date may be picked (and what it moves). */
export function trialHistory(input: HistoryInput): TrialHistory {
  const { student, lessons } = input;
  const items = lessons.map((l) => rowOf(l, input));
  return {
    student_id: student.id,
    status: student.status,
    family_tz: student.guardian?.tz ?? student.tz,
    allowed: canPickTrialDate(student.status),
    count: items.length,
    items,
    upcoming_id: upcomingTrial(lessons, input.now)?.id ?? null,
    student_tz: student.tz,
    ...(student.program ? { program: student.program } : {}),
    ...(student.teacher_gender_pref !== undefined ? { teacher_gender_pref: student.teacher_gender_pref } : {}),
  };
}
