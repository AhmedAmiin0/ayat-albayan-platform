import type { ReportFormResponse, ReportView } from '@ab/shared';

// Shared fixtures for the reports UI tests (test-only module).

export const FULL_GRADES = {
  recitation: 'excellent',
  memorization: 'very_good',
  revision: 'good',
  tajweed: 'very_good',
  engagement: 'excellent',
  commitment: 'excellent',
} as const;

const NO_GRADES = {
  recitation: null,
  memorization: null,
  revision: null,
  tajweed: null,
  engagement: null,
  commitment: null,
};

export function reportView(over: Partial<ReportView> = {}): ReportView {
  return {
    id: 'r-1',
    lesson_id: 'l-1',
    student_id: 's-1',
    teacher_id: 't-abrar',
    attendance: null,
    program: 'quran',
    recited: null,
    new_memorization: null,
    revision: null,
    theory: null,
    grades: { ...NO_GRADES },
    grade_overall: null,
    notes: null,
    homework: null,
    next_plan: null,
    status: 'draft',
    version: 0,
    submitted_at: null,
    edited_at: null,
    pdf_status: null,
    pdf_error: null,
    sent_at: null,
    attachments: [],
    can_edit: true,
    edit_until: null,
    ...over,
  };
}

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
