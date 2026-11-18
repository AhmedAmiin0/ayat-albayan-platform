import { useQuery } from '@tanstack/react-query';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { portalLessonsQuery } from '@ab/web-kit/portal/api';

/**
 * «حسابي»'s child card: the teacher of the child's next lesson (the lessons read the home shares),
 * in the UI language; null while loading or with no lesson ahead (no teacher field elsewhere).
 */
export function useChildTeacher(studentId: string): string | null {
  const next = useQuery(portalLessonsQuery(studentId)).data?.lessons[0];
  return next ? teacherLabel(next.teacher) : null;
}
