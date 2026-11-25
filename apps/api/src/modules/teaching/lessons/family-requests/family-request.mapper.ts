import type { FamilyRequestView } from '@ab/shared';
import type { LessonView } from '@ab/schedule';

/** The row of a lesson with a pending family request; null for any other. */
function toFamilyRequest(l: LessonView): FamilyRequestView | null {
  const p = l.pending_proposal;
  if (p?.requested_by !== 'family') return null;
  return {
    id: p.id,
    lesson_id: l.id,
    starts_at: l.starts_at,
    ends_at: l.ends_at,
    status: l.status,
    proposed_starts_at: p.proposed_starts_at,
    note: p.note,
    created_at: p.created_at,
    teacher: {
      id: l.teacher.id,
      display_name_ar: l.teacher.display_name_ar,
      display_name_en: l.teacher.display_name_en ?? null,
      tz: l.teacher.tz,
    },
    students: l.students.map((s) => ({ id: s.id, code: s.code, name: s.name, tz: s.tz })),
  };
}

/** The rows of the lessons still waiting, in the given (oldest first) order. */
export const familyRequests = (lessons: readonly LessonView[]): FamilyRequestView[] =>
  lessons.flatMap((l) => {
    const row = toFamilyRequest(l);
    return row ? [row] : [];
  });
