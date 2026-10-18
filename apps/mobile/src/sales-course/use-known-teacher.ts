import { teacherName, type Program } from '@ab/shared';
import { useBookingTeachers } from '@/booking/queries';
import { locale } from '@/lib/locale';

export interface KnownTeacher {
  /** Her name; '' until loaded or when she is no longer listed (no row is shown then). */
  name: string;
  /** The list is in and she is not on it, or has no free time: «تابِع بنفس الأيام» is not offered. */
  unavailable: boolean;
}

/**
 * A teacher known only by id (the previous course's, «تابِع بنفس الأيام»): from the same teacher
 * options CourseTeacherStep lists, of the student's program and any gender. Nothing is read without an id.
 */
export function useKnownTeacher(program: Program, teacherId: string | undefined): KnownTeacher {
  const teachers = useBookingTeachers({ program, gender: null, enabled: teacherId !== undefined });
  const found = teachers.data?.find((o) => o.id === teacherId);
  return {
    name: found ? teacherName(found, locale) : '',
    unavailable: teacherId !== undefined && teachers.isSuccess && !found?.has_availability,
  };
}
