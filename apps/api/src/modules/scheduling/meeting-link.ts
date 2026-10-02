export type LinkSources = {
  /** The booking request's / rule's own link (schedule_rules.meeting_link). */
  explicit: string | null | undefined;
  /** students.meeting_link_override of every student on the rule. */
  studentOverrides: readonly (string | null)[];
  /** teachers.meeting_link — the same link every time (issue B8). */
  teacherLink: string | null | undefined;
};

/**
 * Link copied onto a new lesson (docs/10 invariant 3, R-LES-01): the rule's link, else the single
 * student's override, else the teacher's fixed link. Group lessons skip the student override.
 */
export function resolveMeetingLink(s: LinkSources): string | null {
  const own = s.studentOverrides.length === 1 ? s.studentOverrides[0] : null;
  return s.explicit || own || s.teacherLink || null;
}
