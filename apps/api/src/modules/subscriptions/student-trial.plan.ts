import type { Attendance, LessonStatus, PackageSize, TrialFacts } from '@ab/shared';

// The trial facts trialMove reads (owner 2026-10-15, docs/11 §7, R-STU-05), from the student's lessons.

/** A lesson with what tells a trial apart: its rule's package, or the imported marker. */
export interface TrialLesson {
  rule_id: string | null;
  instant: boolean;
  makeup_of_id: string | null;
  rule: { package: PackageSize | null } | null;
}

/** One lesson_students row of the student with its lesson. */
export interface TrialLessonRow {
  student_id: string;
  attendance: Attendance | null;
  chargeable: boolean;
  lesson: (TrialLesson & { status: LessonStatus }) | null;
}

const OPEN: readonly LessonStatus[] = ['scheduled', 'confirmed'];
const HELD: readonly LessonStatus[] = ['completed', 'late'];
const MISSED: readonly (Attendance | null)[] = ['absent', 'excused'];

export const NO_TRIAL: TrialFacts = { open: false, attended: false, paid: false };

/**
 * A trial lesson of this student (as migration 442): its rule's package is 'trial', or an imported
 * one (tools/migrate: no rule, not instant, not a makeup, the student's row not chargeable). The
 * imported marker is best effort: the Sheets kept no other trace of a trial lesson.
 */
export function isTrialLesson(lesson: TrialLesson, chargeable: boolean): boolean {
  if (lesson.rule?.package === 'trial') return true;
  return lesson.rule_id === null && !lesson.instant && lesson.makeup_of_id === null && !chargeable;
}

/**
 * Per student: open = a trial lesson still scheduled / confirmed; attended = a trial lesson completed
 * or late where the student was not marked absent / excused. Other lessons (packages, makeups, instant
 * lessons) are ignored. Students without a row are absent. `paid` is filled later (StudentTrialStatus).
 */
export function trialFactsOf(rows: readonly TrialLessonRow[]): Map<string, TrialFacts> {
  const out = new Map<string, TrialFacts>();
  for (const row of rows) {
    const lesson = row.lesson;
    if (!lesson || !isTrialLesson(lesson, row.chargeable)) continue;
    const seen = out.get(row.student_id) ?? { ...NO_TRIAL };
    if (OPEN.includes(lesson.status)) seen.open = true;
    if (HELD.includes(lesson.status) && !MISSED.includes(row.attendance)) seen.attended = true;
    out.set(row.student_id, seen);
  }
  return out;
}

/** The lessons a change touched: the students of the trial ones, each once. */
export interface ChangedLessonRow extends TrialLesson {
  lesson_students: { student_id: string; chargeable: boolean }[];
}

export function trialStudentsOf(rows: readonly ChangedLessonRow[]): string[] {
  const ids = rows.flatMap((r) => r.lesson_students.filter((s) => isTrialLesson(r, s.chargeable)).map((s) => s.student_id));
  return [...new Set(ids)];
}
