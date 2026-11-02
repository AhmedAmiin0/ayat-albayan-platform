import { teacherName, type Program } from '@ab/shared';
import { useBookingTeachers } from '@/booking/shared/queries';
import { locale } from '@/core/lib/i18n/locale';

export interface KnownTeacher {
  /** Her name; '' until loaded or when she is no longer listed (no row is shown then). */
  name: string;
  /** The list is in and she is on it with free time: the only state «تابِع بنفس الأيام» is enabled in. */
  bookable: boolean;
  /** The list is still loading: «تابِع بنفس الأيام» is shown busy. */
  pending: boolean;
  /** The list failed to load: the error with a retry (refetch), never «unavailable». */
  failed: boolean;
  /** The list is in and she is not on it, or has no free time: said so, «تابِع بنفس الأيام» disabled. */
  unavailable: boolean;
  /** Re-asks the list (the retry of failed). */
  refetch: () => void;
}

/**
 * A teacher known only by id (the previous course's, «تابِع بنفس الأيام»): from the same teacher
 * options CourseTeacherStep lists, of the student's program and any gender. Nothing is read without an id.
 */
export function useKnownTeacher(program: Program, teacherId: string | undefined): KnownTeacher {
  const teachers = useBookingTeachers({ program, gender: null, enabled: teacherId !== undefined });
  const known = teacherId !== undefined;
  const found = teachers.data?.find((o) => o.id === teacherId);
  const bookable = known && teachers.isSuccess && found?.has_availability === true;
  return {
    name: found ? teacherName(found, locale) : '',
    bookable,
    pending: known && teachers.isPending,
    failed: known && teachers.isError,
    unavailable: known && teachers.isSuccess && !bookable,
    refetch: () => void teachers.refetch(),
  };
}
