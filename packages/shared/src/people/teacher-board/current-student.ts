import type { StudentStatus } from '@ab/catalog';
import { isCurrentStudent, splitByStatus, type StudentListKind } from '../students/student-lists.js';

// docs/46 D4: the teacher board lists only her CURRENT students (isCurrentStudent: not paused, not
// churned). TeacherMeRepo.students holds the ones assigned to her or on her active rules; the inbox
// reads it unfiltered, so this filter runs on the client, never in that query.

/** Her current students of one kind («مشترك» / «تجريبي» / «الكل»), in the order given. */
export function boardStudents<T extends { status: StudentStatus }>(
  students: readonly T[],
  kind: StudentListKind,
): T[] {
  return splitByStatus(
    students.filter((s) => isCurrentStudent(s.status)),
    kind,
  );
}
