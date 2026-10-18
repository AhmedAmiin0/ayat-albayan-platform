import { teacherName, type Program } from '@ab/shared';
import { useBookingTeachers } from '@/booking/queries';
import { locale } from '@/lib/locale';

export interface KnownTeacher {
  /** Her name; '' until loaded or when she is no longer listed (no row is shown then). */
  name: string;
  /** The list is in and she is on it with free time: the only state «تابِع بنفس الأيام» is enabled in. */
  bookable: boolean;
  /** The list failed, or she is not on it, or has no free time: said so, «تابِع بنفس الأيام» disabled. */
  unavailable: boolean;
}

/**
 * A teacher known only by id (the previous course's, «تابِع بنفس الأيام»): from the same teacher
 * options CourseTeacherStep lists, of the student's program and any gender. Nothing is read without an id.
 */
export function useKnownTeacher(program: Program, teacherId: string | undefined): KnownTeacher {
  const teachers = useBookingTeachers({ program, gender: null, enabled: teacherId !== undefined });
  const found = teachers.data?.find((o) => o.id === teacherId);
  const bookable = teacherId !== undefined && teachers.isSuccess && found?.has_availability === true;
  return {
    name: found ? teacherName(found, locale) : '',
    bookable,
    // Still loading is neither: nothing said yet, «تابِع» stays disabled until she is confirmed.
    unavailable: teacherId !== undefined && (teachers.isError || (teachers.isSuccess && !bookable)),
  };
}
