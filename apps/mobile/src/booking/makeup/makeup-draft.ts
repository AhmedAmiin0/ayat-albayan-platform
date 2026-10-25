import { DURATIONS, teacherName, type Duration, type LessonView } from '@ab/shared';
import type { InvoiceDraft } from '../shared/contract';
import { DEFAULT_MINUTES } from '../trial/lib/package-choice';
import { locale } from '@/core/lib/i18n/locale';

/** The missed lesson a makeup is for, as the schedule row hands it over (route params). */
export interface MakeupSource {
  lessonId: string;
  studentId: string;
  studentName: string;
  /** The student's zone: the slot's small clock, and the rule's. */
  tz: string;
  /** When the missed lesson was (UTC instant). */
  missedAt: string;
  /** The original's length, which the makeup keeps. */
  durationMin: Duration;
  teacherId: string;
  teacherName: string;
}

export interface MakeupDraft {
  source: MakeupSource;
  /** Preselected as the original's teacher; the admin may pick another. */
  teacher: { id: string; name: string };
  startsAt: string | null;
  invoice: InvoiceDraft | null;
}

export function makeupDraft(source: MakeupSource): MakeupDraft {
  return {
    source,
    teacher: { id: source.teacherId, name: source.teacherName },
    startsAt: null,
    invoice: null,
  };
}

/** The row's lesson and student as route params (a route carries strings only). */
export function makeupParams(
  lesson: LessonView,
  student: LessonView['students'][number],
): Record<keyof MakeupSource, string> {
  return {
    lessonId: lesson.id,
    studentId: student.id,
    studentName: student.name,
    tz: student.tz,
    missedAt: lesson.starts_at,
    durationMin: String(lengthOf(lesson)),
    teacherId: lesson.teacher.id,
    teacherName: teacherName(lesson.teacher, locale),
  };
}

type Params = Partial<Record<keyof MakeupSource, string | string[]>>;

/** The route's params back into a source; null when one is missing, so a bad link shows «مش لاقيين». */
export function sourceFromParams(p: Params): MakeupSource | null {
  const one = (v: string | string[] | undefined) => (typeof v === 'string' && v ? v : null);
  const minutes = Number(one(p.durationMin));
  const durationMin = DURATIONS.find((d) => d === minutes);
  const [lessonId, studentId, studentName, tz, missedAt, teacherId, teacherName] = [
    p.lessonId,
    p.studentId,
    p.studentName,
    p.tz,
    p.missedAt,
    p.teacherId,
    p.teacherName,
  ].map(one);
  if (!lessonId || !studentId || !studentName || !tz || !missedAt || !teacherId || !teacherName) {
    return null;
  }
  if (!durationMin) return null;
  return { lessonId, studentId, studentName, tz, missedAt, durationMin, teacherId, teacherName };
}

/** The original's length when it is one the slots API offers (30/45/60/90); else the form's 45. */
export function lengthOf(lesson: LessonView): Duration {
  const min = Math.round((Date.parse(lesson.ends_at) - Date.parse(lesson.starts_at)) / 60_000);
  return DURATIONS.find((d) => d === min) ?? DEFAULT_MINUTES;
}
