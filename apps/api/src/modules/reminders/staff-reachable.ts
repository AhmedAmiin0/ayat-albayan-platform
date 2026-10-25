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

/** The staff WhatsApp alerts: queued to a teacher's number, checked again when sent (send-stale). */
export const STAFF_ALERT_KEYS: readonly string[] = ['teacher_new_student', 'teacher_lesson_reminder', 'teacher_lesson_reminder_meet'];

export function isStaffAlert(templateKey: string | null): boolean {
  return templateKey !== null && STAFF_ALERT_KEYS.includes(templateKey);
}

/** A teacher row the sender found for a staff alert (staffAtSend). */
export type StaffAtSend = StaffOnRecord & { phone_e164: string | null };

/**
 * Why a queued staff alert must not go out any more (send-stale dropReason), or null. A row may
 * wait in the queue while the send gate is closed: the teacher made inactive, their login disabled,
 * removed, or given another number meanwhile hears nothing (the planner's staffReachable, again).
 */
export function staffStale(found: readonly StaffAtSend[], phone: string): string | null {
  if (found.length === 0) return 'teacher not on record';
  if (!found.every(staffReachable)) return 'teacher inactive or login disabled';
  return found.some((t) => t.phone_e164 === phone) ? null : 'teacher number changed';
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The teacher a staff alert was queued for: its dedup_key «<key>:<lesson id>:<teacher id>»
 * (TeacherAlert, planReminders). null = some other shape: the sender then goes by the number.
 */
export function staffTeacherId(dedupKey: string | null): string | null {
  const id = dedupKey?.split(':')[2];
  return id && UUID.test(id) ? id : null;
}
