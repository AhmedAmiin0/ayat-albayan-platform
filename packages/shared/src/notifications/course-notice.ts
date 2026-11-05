// A staff notice that opens the course wizard (owner 2026-11-06): a package paid with no weekly
// course yet. Its data carries `open: 'course'` beside the student (and the family's phone, so the
// web opens that chat with «أيام الحلقات»); web-path.ts and the app's push route read it.

/** The `open` value of a notice that books the student's lesson days. */
export const OPEN_COURSE = 'course';

/** The push / bell data of a «احجز أيام الحلقات» notice. */
export function courseNoticeData(studentId: string, phone: string | null): Record<string, string> {
  return { studentId, open: OPEN_COURSE, ...(phone ? { phone } : {}) };
}
