import { useQuery } from '@tanstack/react-query';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { portalLessonsQuery, portalReportsQuery } from '@ab/web-kit/portal/api';
import { heroTeacher } from './hero-teacher';

/**
 * The hero's teacher name for one student from the reads the pages already share (lessons,
 * reports); null until one of them names a teacher.
 */
export function useHeroTeacher(studentId: string): string | null {
  const lessons = useQuery(portalLessonsQuery(studentId));
  const reports = useQuery(portalReportsQuery(studentId));
  const teacher = heroTeacher({ lessons: lessons.data, reports: reports.data }, useNow());
  return teacher && teacherLabel(teacher);
}
