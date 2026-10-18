import type { BookingTeacherOption } from '@ab/shared';
import type { BookSearch } from './api';
import type { BookingKind } from './contract';
import { withPicks } from './draft.days';
import type { BookingDraft } from './draft';

/** A free gap clicked on the calendar: preselect this teacher, then this first lesson. */
export interface BookHint {
  teacherId: string;
  startsAt: string | null;
  /** «تابِع بنفس الأيام»: the previous course's picks, brought with the hinted teacher (over startsAt). */
  picks?: readonly string[];
}

export function bookHint(search: BookSearch): BookHint | null {
  return search.teacherId ? { teacherId: search.teacherId, startsAt: search.startsAt ?? null } : null;
}

type TeacherChange = Partial<Pick<BookingDraft, 'program' | 'genderPref'>> & { teacher?: BookingTeacherOption | null };

/**
 * The draft change for a teacher step edit. A start picked for one teacher never carries over to
 * another (their free time differs); picking the hinted teacher brings the hinted start, or the
 * hinted picks of a renewal («تابِع بنفس الأيام»).
 */
export function teacherPatch(draft: BookingDraft, change: TeacherChange, hint: BookHint | null): Partial<BookingDraft> {
  if (change.teacher === undefined || change.teacher?.id === draft.teacher?.id) return change;
  const hinted = hint !== null && change.teacher?.id === hint.teacherId;
  return { ...change, ...(hinted ? hintedPicks(hint) : { startsAt: null, extra: [] }) };
}

/** The hinted picks (a renewal), else the hinted start alone. */
const hintedPicks = (hint: BookHint): Pick<BookingDraft, 'startsAt' | 'extra'> =>
  hint.picks && hint.picks.length > 0 ? withPicks(hint.picks) : { startsAt: hint.startsAt, extra: [] };

/**
 * Picking a student in the wizard reopens /admin/book for them: the free gap's teacher and start
 * ride along (an unrelated lead or package never does), so step 2 still has the gap's teacher.
 */
export function searchForStudent(prev: BookSearch, studentId: string, kind?: BookingKind): BookSearch {
  return {
    studentId,
    ...(prev.teacherId && { teacherId: prev.teacherId }),
    ...(prev.startsAt && { startsAt: prev.startsAt }),
    ...(kind && kind !== 'package' && { kind }),
  };
}
