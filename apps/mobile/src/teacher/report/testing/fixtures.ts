import type { ReportFormResponse, ReportView } from '@ab/shared';
import { reportView } from '@ab/shared/testing';

// «تقرير الحلقة» test rows in the GET /lessons/:id/report-form shape (abrar's lesson, test-only).
// FULL_GRADES and reportView live in @ab/shared/testing (shared with the other app).
export { FULL_GRADES, reportView } from '@ab/shared/testing';

/** Saturday 3 Oct 2026, 16:00 Riyadh (13:00Z), started; one student with a 4-lesson package. */
export function formResponse(report: Partial<ReportView> = {}): ReportFormResponse {
  return {
    lesson: {
      id: 'l-1',
      starts_at: '2026-10-03T13:00:00.000Z',
      ends_at: '2026-10-03T13:45:00.000Z',
      status: 'scheduled',
      meeting_link: 'https://meet.google.com/abc-defg-hij',
      teacher: { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo' },
    },
    entries: [
      {
        student: { id: 's-1', code: 'AB-0182', name: 'يوسف أحمد', tz: 'Asia/Riyadh', program: 'quran' },
        lesson_no: 3,
        package: null,
        report: reportView(report),
      },
    ],
    submit_block: null,
  };
}
