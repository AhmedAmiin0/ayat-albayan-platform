import { nextLesson } from '@ab/client-core';
import type { PortalLessons, PortalReports, PortalTeacher } from '@ab/shared';

interface Reads {
  lessons?: Pick<PortalLessons, 'lessons'>;
  reports?: PortalReports;
}

const named = (teacher: PortalTeacher | null | undefined): PortalTeacher | null =>
  teacher?.display_name_ar ? teacher : null;

const newest = (reports: PortalReports | undefined) => reports?.reports[0]?.teacher;

/**
 * The teacher the hero names (boards: «المعلمة: …»): the next lesson's, else the newest report's;
 * null when neither read names one (the hero then says nothing, never a guess).
 */
export function heroTeacher({ lessons, reports }: Reads, now: Date): PortalTeacher | null {
  const lesson = nextLesson(lessons ? lessons.lessons : [], now);
  return named(lesson?.teacher) ?? named(newest(reports));
}
