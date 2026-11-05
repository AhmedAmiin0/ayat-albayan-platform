// The /people/* API of «تعديل البيانات», «ربط بولي أمر آخر» and «تحويل» (owner 2026-11-02), for
// both apps: one path builder and one query key, so web and mobile never drift.

export const PEOPLE_EDIT_KEY = ['people-edit'] as const;

/** GET /people/students/:id: the edit view of one student and their family. */
export const peopleEditKey = (studentId: string) => [...PEOPLE_EDIT_KEY, studentId] as const;

/** The guardian picker's results for one search. */
export const familySearchKey = (search: string) =>
  [...PEOPLE_EDIT_KEY, 'families', search] as const;

const student = (id: string): string => `/people/students/${encodeURIComponent(id)}`;
const guardian = (id: string): string => `/people/guardians/${encodeURIComponent(id)}`;

export const peopleEditPaths = {
  student,
  guardian,
  /** The family's second number (DELETE). */
  secondPhone: (guardianId: string, phone: string): string =>
    `${guardian(guardianId)}/phones/${encodeURIComponent(phone)}`,
  families: (search: string): string => `/people/guardians?search=${encodeURIComponent(search)}`,
  move: (studentId: string): string => `${student(studentId)}/guardian`,
  contactSelf: (studentId: string): string => `${student(studentId)}/contact-self`,
  toStudent: (guardianId: string): string => `${guardian(guardianId)}/to-student`,
  toGuardian: (studentId: string): string => `${student(studentId)}/to-guardian`,
};
