// «المعلم/ة» in the assistant's subscribe step (owner 2026-10-29, docs/16 row 38), for web and mobile.

/** A teacher she picked for one student (a new child starts again from theirs). */
export interface TeacherPick {
  studentId: string;
  teacherId: string;
}

interface ChoiceInput {
  studentId: string;
  pick: TeacherPick | null;
  /** The active teachers once loaded: a student's own teacher not among them (inactive) is no default. */
  options?: readonly { id: string }[] | undefined;
}

/**
 * The teacher to send: her pick for this student, else the student's own (students.teacher_id, the trial's)
 * while still active; '' = none. `body` is what POST /sales/subscriptions carries: teacherId only when set.
 */
export function teacherChoice(
  students: readonly { id: string; teacher_id: string | null }[],
  input: ChoiceInput,
): { teacherId: string; body: { teacherId?: string } } {
  const stored = students.find((s) => s.id === input.studentId)?.teacher_id ?? '';
  const own = input.options && !input.options.some((o) => o.id === stored) ? '' : stored;
  const teacherId = input.pick?.studentId === input.studentId ? input.pick.teacherId : own;
  return { teacherId, body: teacherId ? { teacherId } : {} };
}
