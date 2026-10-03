// Test fixtures for the reports tests (not shipped; excluded from the build by *.fakes.ts).
import type { AuthUser } from '../../common/auth/verify-token';
import type { ReportLessonRow, ReportRow } from './report-row';

export const TEACHER_ID = '00000000-0000-4000-8000-0000000000b1';
export const OTHER_TEACHER_ID = '00000000-0000-4000-8000-0000000000b2';
export const STUDENT_ID = '00000000-0000-4000-8000-0000000000c1';
export const SIBLING_ID = '00000000-0000-4000-8000-0000000000c2';
export const LESSON_ID = '00000000-0000-4000-8000-0000000000d1';
export const REPORT_ID = '00000000-0000-4000-8000-0000000000f1';
export const ATTACHMENT_ID = '00000000-0000-4000-8000-0000000000f9';

export const ADMIN: AuthUser = { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' };
export const TEACHER: AuthUser = { id: 'b0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' };
export const OTHER_TEACHER: AuthUser = { id: 'b0000000-0000-4000-8000-000000000003', email: null, role: 'teacher' };
export const GUARDIAN: AuthUser = { id: 'c0000000-0000-4000-8000-000000000004', email: null, role: 'guardian' };

/** Sunday 2026-10-04 17:00–17:45 Riyadh (14:00Z). */
export const STARTS_AT = '2026-10-04T14:00:00+00:00';
/** After the lesson started; before it (for not_started). */
export const AFTER = new Date('2026-10-04T15:00:00Z');
export const BEFORE = new Date('2026-10-04T10:00:00Z');

export const FULL_GRADES = {
  recitation: 'excellent',
  memorization: 'very_good',
  revision: 'good',
  tajweed: 'very_good',
  engagement: 'excellent',
  commitment: 'excellent',
} as const;

/** A fresh draft for the one student of the lesson. */
export function reportRow(over: Partial<ReportRow> = {}): ReportRow {
  return {
    id: REPORT_ID,
    lesson_id: LESSON_ID,
    student_id: STUDENT_ID,
    teacher_id: TEACHER_ID,
    attendance: null,
    recited: null,
    new_memorization: null,
    revision: null,
    theory: null,
    grade_recitation: null,
    grade_memorization: null,
    grade_revision: null,
    grade_tajweed: null,
    grade_engagement: null,
    grade_commitment: null,
    grade_overall: null,
    notes: null,
    homework: null,
    next_plan: null,
    status: 'draft',
    version: 0,
    submitted_at: null,
    edited_at: null,
    pdf_path: null,
    pdf_status: null,
    pdf_error: null,
    sent_at: null,
    attachments: [],
    ...over,
  };
}

/** The same report after its first submit at AFTER (version 1, PDF pending). */
export function submittedRow(over: Partial<ReportRow> = {}): ReportRow {
  return reportRow({
    attendance: 'on_time',
    status: 'submitted',
    version: 1,
    submitted_at: AFTER.toISOString(),
    pdf_status: 'pending',
    ...over,
  });
}

/** The lesson of REPORT_ID: scheduled, one student, attendance not marked yet. */
export function lessonRow(over: Partial<ReportLessonRow> = {}): ReportLessonRow {
  return {
    id: LESSON_ID,
    teacher_id: TEACHER_ID,
    starts_at: STARTS_AT,
    ends_at: '2026-10-04T14:45:00+00:00',
    status: 'scheduled',
    meeting_link: 'https://meet.jit.si/abrar',
    teacher: { id: TEACHER_ID, display_name_ar: 'أبرار', display_name_en: null, tz: 'Africa/Cairo' },
    lesson_students: [
      {
        student_id: STUDENT_ID,
        attendance: null,
        chargeable: true,
        student: { id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة', tz: 'Asia/Riyadh', program: 'quran' },
      },
    ],
    ...over,
  };
}
