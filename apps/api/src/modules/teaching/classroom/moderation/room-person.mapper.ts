// Removal blocks every guest link of a lesson that belongs to one person.

/** A lesson_join_links row as the removal reads it. */
export interface LinkRow {
  id: string;
  /** The (lesson, student) row of the portal / the student's link. */
  student_id: string | null;
  /** Whom a link sent by WhatsApp was for (migration 20261117100170); null on older rows. */
  sent_for_student_id: string | null;
}

/** A student on the lesson, with their guardian (siblings share one). */
export interface LessonStudentRow {
  student_id: string;
  guardian_id: string | null;
}

const studentOf = (link: LinkRow): string | null => link.student_id ?? link.sent_for_student_id;

/** The removed student and their siblings on this lesson (one guardian): one family. */
function familyOf(studentId: string, students: readonly LessonStudentRow[]): Set<string> {
  const guardian = students.find((s) => s.student_id === studentId)?.guardian_id ?? null;
  const siblings = students.filter((s) => guardian !== null && s.guardian_id === guardian);
  return new Set([studentId, ...siblings.map((s) => s.student_id)]);
}

/**
 * Every link of the person behind `ownId`: in a one-student lesson every link of the lesson (all
 * that family's); else the links of their family's students (sent for them, or their portal row),
 * and only the own link when it names no student. Always the own link.
 */
export function personLinkIds(
  ownId: string,
  input: { links: readonly LinkRow[]; students: readonly LessonStudentRow[] },
): string[] {
  const own = input.links.find((l) => l.id === ownId);
  const student = own ? studentOf(own) : null;
  const solo = input.students.length <= 1;
  const family = student ? familyOf(student, input.students) : new Set<string>();
  const theirs = (l: LinkRow): boolean => {
    const of = studentOf(l);
    return solo || (of !== null && family.has(of));
  };
  return [...new Set([ownId, ...input.links.filter(theirs).map((l) => l.id)])];
}
