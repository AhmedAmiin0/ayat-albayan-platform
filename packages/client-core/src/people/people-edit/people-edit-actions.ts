import type { PeopleEditView } from '@ab/shared';

/** Which guardian ↔ student actions the view offers (the API refuses the others with a 409). */
export interface RoleActions {
  /** «الطالب هو ولي الأمر» is on for this student. */
  selfOn: boolean;
  /** Turning it on: no other child of the family holds the number. */
  canSetSelf: boolean;
  /** «تحويل ولي الأمر إلى طالب»: no child of the family is the guardian already. */
  canGuardianToStudent: boolean;
  /** «تحويل الطالب إلى ولي أمر»: no login of their own (the history is checked on save). */
  canStudentToGuardian: boolean;
}

export function roleActions({ student, guardian }: PeopleEditView): RoleActions {
  const selfChildren = guardian.students.filter((s) => s.contact_is_self);
  return {
    selfOn: student.contact_is_self,
    canSetSelf: selfChildren.every((s) => s.id === student.id),
    canGuardianToStudent: selfChildren.length === 0,
    canStudentToGuardian: !student.has_login,
  };
}
