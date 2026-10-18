import { teacherName, type Program } from '@ab/shared';
import { useBookingTeachers } from '@/booking/queries';
import { locale } from '@/lib/locale';

/**
 * The name of a teacher known only by id (the previous course's, «تابِع بنفس الأيام»): from the same
 * teacher options CourseTeacherStep lists, of the student's program and any gender; '' until loaded
 * (or when she is no longer listed). Nothing is read without an id.
 */
export function useTeacherName(program: Program, teacherId: string | undefined): string {
  const teachers = useBookingTeachers({ program, gender: null, enabled: teacherId !== undefined });
  const found = teachers.data?.find((o) => o.id === teacherId);
  return found ? teacherName(found, locale) : '';
}
