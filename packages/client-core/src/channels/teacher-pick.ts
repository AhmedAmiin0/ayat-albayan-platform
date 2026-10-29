// «المعلم/ة» in the assistant's subscribe step (owner 2026-10-29, docs/16 row 38), for web and mobile.

/** A teacher she picked for one student (a new child starts again from theirs). */
export interface TeacherPick {
  studentId: string;
  teacherId: string;
}

/**
 * The teacher to send: her pick for this student, else the student's own (students.teacher_id, the trial's);
 * '' = none. `body` is what POST /sales/subscriptions carries: teacherId only when one is set.
 */
export function teacherChoice(
  students: readonly { id: string; teacher_id: string | null }[],
  input: { studentId: string; pick: TeacherPick | null },
): { teacherId: string; body: { teacherId?: string } } {
  const own = students.find((s) => s.id === input.studentId)?.teacher_id ?? '';
  const teacherId = input.pick?.studentId === input.studentId ? input.pick.teacherId : own;
  return { teacherId, body: teacherId ? { teacherId } : {} };
}
