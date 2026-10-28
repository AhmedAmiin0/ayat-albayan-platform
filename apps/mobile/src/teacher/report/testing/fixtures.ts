import { emptyContent, type MemoryView, type Program, type ReportFormResponse, type ReportView } from '@ab/shared';
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

/** Al-Mulk 1–15 recited and memorised last time, Al-Qalam revised; Al-Mulk and Al-Qalam recent. */
const MEMORY: MemoryView = {
  last: { recited: { surah: 67, from: 1, to: 15 }, new: { surah: 67, from: 1, to: 15 }, revision: { surah: 68, from: 1, to: 20 } },
  recent_surahs: [67, 68],
};

/** The same lesson on the new form (form_version 2): a 12-lesson package and the student's history. */
export function formResponseV2(
  opts: { report?: Partial<ReportView>; memory?: MemoryView | null; program?: Program } = {},
): ReportFormResponse {
  const form = formResponse({ form_version: 2, content: emptyContent(), program: opts.program ?? 'quran', ...opts.report });
  const pkg = { subscription_id: 'sub-1', lessons_total: 12, lessons_used: 8, remaining: 4, ended_at: null, projected_end_at: null };
  return {
    ...form,
    entries: form.entries.map((e) => ({
      ...e,
      student: { ...e.student, program: opts.program ?? 'quran' },
      lesson_no: 9,
      package: pkg,
      memory: opts.memory === undefined ? MEMORY : opts.memory,
    })),
  };
}
