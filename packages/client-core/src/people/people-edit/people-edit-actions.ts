import type { PeopleEditView } from '@ab/shared';

/** Which guardian ↔ student actions the view offers (the API refuses the others with a 409). */
export interface RoleActions {
  /** «الطالب هو ولي الأمر» is on for this student. */
  selfOn: boolean;
  /** Turning it on: no other child of the family holds the number. */
  canSetSelf: boolean;
  /** «تحويل ولي الأمر إلى طالب»: no child of the family is the guardian already. */
  canGuardianToStudent: boolean;
  /** «تحويل الطالب إلى ولي أمر»: no login of their own and no history at all. */
  canStudentToGuardian: boolean;
  /** «ربط بولي أمر آخر»: no login of their own, and not the adult learner of a family login. */
  canMove: boolean;
}

export function roleActions({ student, guardian }: PeopleEditView): RoleActions {
  const selfChildren = guardian.students.filter((s) => s.contact_is_self);
  return {
    selfOn: student.contact_is_self,
    canSetSelf: selfChildren.every((s) => s.id === student.id),
    canGuardianToStudent: selfChildren.length === 0,
    canStudentToGuardian: !student.has_login && !student.has_records,
    canMove: !student.has_login && !(student.contact_is_self && guardian.has_login),
  };
}

/** Why «تحويل إلى ولي أمر» is off (a login, then any history), else what it does. */
export function toGuardianHint(
  student: { has_login: boolean; has_records: boolean },
  text: { toGuardianLogin: string; toGuardianRecords: string; toGuardianHint: string },
): string {
  const reasons = [
    { when: student.has_login, text: text.toGuardianLogin },
    { when: student.has_records, text: text.toGuardianRecords },
  ];
  return reasons.find((r) => r.when)?.text ?? text.toGuardianHint;
}
