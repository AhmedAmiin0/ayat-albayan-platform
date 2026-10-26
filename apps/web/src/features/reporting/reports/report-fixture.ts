import type { ReportFormResponse, ReportView } from '@ab/shared';
import { reportView } from '@ab/shared/testing';

// Shared fixtures for the reports UI tests (test-only module).
// FULL_GRADES and reportView live in @ab/shared/testing (shared with the other app).
export { FULL_GRADES, reportView } from '@ab/shared/testing';

/** Saturday 3 Oct 2026, 16:00 Riyadh (13:00Z), started; one student with a 4-lesson package. */
export function formResponse(over: Partial<ReportFormResponse> = {}, report: Partial<ReportView> = {}): ReportFormResponse {
  return {
    lesson: {
      id: 'l-1',
      starts_at: '2026-10-03T13:00:00.000Z',
      ends_at: '2026-10-03T14:30:00.000Z',
      status: 'scheduled',
      meeting_link: 'https://meet.jit.si/ayat-abrar',
      teacher: { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo' },
    },
    entries: [
      {
        student: { id: 's-1', code: 'AB-0183', name: 'سهيلة', tz: 'Asia/Riyadh', program: 'quran' },
        lesson_no: 2,
        package: { subscription_id: 'sub-1', lessons_total: 4, lessons_used: 1, remaining: 3, ended_at: null, projected_end_at: null },
        report: reportView(report),
      },
    ],
    submit_block: null,
    ...over,
  };
}
