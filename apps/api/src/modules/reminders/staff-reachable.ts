/** What a staff WhatsApp alert knows of its teacher (teachers.status, the linked login's disabled_at). */
export interface StaffOnRecord {
  /** teachers.status; optional in fakes. */
  status?: 'active' | 'inactive';
  /** The teacher's login (teachers.profile_id → profiles); null = none; optional in fakes. */
  profile?: { disabled_at: string | null } | null;
}

/**
 * May a staff WhatsApp alert (teacher_new_student, teacher_lesson_reminder) go to this teacher's
 * number on record? Not to an inactive teacher, nor to one whose login was disabled: an offboarded
 * teacher hears nothing more about the academy's lessons or families. Pure.
 */
export function staffReachable(teacher: StaffOnRecord): boolean {
  return teacher.status !== 'inactive' && !teacher.profile?.disabled_at;
}
