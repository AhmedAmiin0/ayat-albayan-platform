import type { ThreadPeople, ThreadView } from '@ab/shared';
import type { PeopleStudentRow } from '../people/thread-people.mapper';
import type { ThreadRow } from '../threads/threads.mapper';

/**
 * A thread as a teacher sees it: no lead (the admin's pipeline), no family tags («مشترك»,
 * «مش مدفوع»: they are about money), and their own unread count (teacher_unread), never the
 * admin's read_at.
 */
export function forTeacher(view: ThreadView, unread: ReadonlyMap<string, number>): ThreadView {
  return {
    ...view,
    lead_id: null,
    lead_name: null,
    lead_status: null,
    lead_source: null,
    subscribed: false,
    badge: null,
    unpaid: false,
    unread_count: unread.get(view.phone_e164) ?? 0,
  };
}

interface TeacherPeopleInput {
  row: ThreadRow | null;
  /** The guardian's students (TeacherThreadsQueries.guardianStudents), oldest first. */
  students: readonly PeopleStudentRow[];
  /** Ids of the teacher's own students (TeacherMeQueries.students). */
  mine: ReadonlySet<string>;
}

/** The guardian, no lead, and only the children this teacher teaches, without packages or money. */
export function teacherPeople(input: TeacherPeopleInput): ThreadPeople {
  const { row } = input;
  const guardian = row?.guardian_id ? { id: row.guardian_id, name: row.guardian_name ?? '' } : null;
  if (!guardian) return { guardian, lead: null, students: [] };
  const students = input.students
    .filter((s) => input.mine.has(s.id))
    .map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code ?? '',
      teacher_name: s.teacher?.display_name_ar ?? null,
      status: s.status,
      subscription: null,
    }));
  return { guardian, lead: null, students };
}
