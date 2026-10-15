import type { Attendance, LessonStatus, PackageSize, TrialFacts } from '@ab/shared';

// The trial facts trialMove reads (owner 2026-10-15, docs/11 §7, R-STU-05), from the student's lessons.

/** One lesson_students row of the student with its lesson and the lesson's rule package. */
export interface TrialLessonRow {
  student_id: string;
  attendance: Attendance | null;
  lesson: { status: LessonStatus; rule: { package: PackageSize | null } | null } | null;
}

const OPEN: readonly LessonStatus[] = ['scheduled', 'confirmed'];
const HELD: readonly LessonStatus[] = ['completed', 'late'];
const MISSED: readonly (Attendance | null)[] = ['absent', 'excused'];

export const NO_TRIAL: TrialFacts = { open: false, attended: false };

/**
 * Per student: open = a trial lesson (its rule's package is 'trial') still scheduled / confirmed;
 * attended = a trial lesson completed or late where the student was not marked absent / excused.
 * Other lessons (packages, makeups, instant lessons) are ignored. Students without a row are absent.
 */
export function trialFactsOf(rows: readonly TrialLessonRow[]): Map<string, TrialFacts> {
  const out = new Map<string, TrialFacts>();
  for (const row of rows) {
    const lesson = row.lesson;
    if (!lesson || lesson.rule?.package !== 'trial') continue;
    const seen = out.get(row.student_id) ?? { ...NO_TRIAL };
    if (OPEN.includes(lesson.status)) seen.open = true;
    if (HELD.includes(lesson.status) && !MISSED.includes(row.attendance)) seen.attended = true;
    out.set(row.student_id, seen);
  }
  return out;
}

/** The lessons a change touched: the students of those whose rule is a trial, each once. */
export interface ChangedLessonRow {
  rule: { package: PackageSize | null } | null;
  lesson_students: { student_id: string }[];
}

export function trialStudentsOf(rows: readonly ChangedLessonRow[]): string[] {
  const ids = rows.filter((r) => r.rule?.package === 'trial').flatMap((r) => r.lesson_students.map((s) => s.student_id));
  return [...new Set(ids)];
}
