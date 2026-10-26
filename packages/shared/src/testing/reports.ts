import type { ReportView } from '../reports/views.js';

// Test-only «تقرير الحلقة» rows shared by the web and mobile tests (never imported by app code).

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
