import { teacherName, type Program } from '@ab/shared';
import { useBookingTeachers } from '@/booking/shared/queries';
import { locale } from '@ab/mobile-kit';

export interface KnownTeacher {
  /** Her name; '' until loaded or when she is no longer listed (no row is shown then). */
  name: string;
  /** The only state in which continuing with the same days is enabled. */
  bookable: boolean;
  pending: boolean;
  /** The list failed to load: the error with a retry (refetch), never «unavailable». */
  failed: boolean;
  unavailable: boolean;
  /** Re-asks the list (the retry of failed). */
  refetch: () => void;
}

/** Same options as CourseTeacherStep, any gender; nothing is read without an id. */
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
