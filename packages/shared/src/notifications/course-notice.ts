// A paid package with no weekly course yet; data carries `open: 'course'` and the family phone.

/** The `open` value of a notice that books the student's lesson days. */
export const OPEN_COURSE = 'course';

/** The push and bell data of a book-lesson-days notice. */
export function courseNoticeData(studentId: string, phone: string | null): Record<string, string> {
  return { studentId, open: OPEN_COURSE, ...(phone ? { phone } : {}) };
}
