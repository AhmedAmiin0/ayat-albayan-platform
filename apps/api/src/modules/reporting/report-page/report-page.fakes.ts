import type { AuthUser } from '@/common/auth/verify-token';
import type { PageFacts, PageReportRow } from './report-page.types';

// Invented ids and names: no real student, teacher, family or phone.
export const PUBLIC_ID = 'aaaabbbbccccddddeeeeffff00001111';
export const REPORT_ID = '00000000-0000-4000-8000-0000000000f1';
export const STUDENT_ID = '00000000-0000-4000-8000-0000000000c1';

export const user = (role: AuthUser['role'], id = `${role ?? 'none'}-profile`): AuthUser => ({
  id,
  email: null,
  role,
});

export function pageRow(over: Partial<PageReportRow> = {}): PageReportRow {
  return {
    id: REPORT_ID,
    public_id: PUBLIC_ID,
    lesson_id: 'l1',
    student_id: STUDENT_ID,
    teacher_id: 't1',
    status: 'submitted',
    version: 2,
    form_version: 2,
    attendance: 'on_time',
    program: 'quran',
    recited: 'الملك 1–15',
    new_memorization: null,
    revision: null,
    theory: null,
    grade_recitation: 'very_good',
    grade_memorization: null,
    grade_revision: null,
    grade_tajweed: null,
    grade_engagement: null,
    grade_commitment: null,
    grade_overall: 'excellent',
    notes: 'ملاحظة',
    homework: 'واجب',
    next_plan: null,
    content: { segments: [{ kind: 'recited', surah: 67, from: 1, to: 15, grade: 'very_good' }] },
    submitted_at: '2026-10-04T15:00:00Z',
    edited_at: null,
    pdf_status: 'ready',
    pdf_path: 's1/l1.pdf',
    attachments: [
      {
        id: '00000000-0000-4000-8000-0000000000a2',
        storage_path: 'r/b.png',
        mime: 'image/png',
        size: 20,
        created_at: '2026-10-04T15:02:00Z',
      },
      {
        id: '00000000-0000-4000-8000-0000000000a1',
        storage_path: 'r/a.pdf',
        mime: 'application/pdf',
        size: 10,
        created_at: '2026-10-04T15:01:00Z',
      },
    ],
    ...over,
  };
}

export function pageFacts(): PageFacts {
  return {
    lesson: { starts_at: '2026-10-04T14:00:00Z', ends_at: '2026-10-04T14:45:00Z' },
    student: {
      name: 'سهيلة',
      code: 'AB-0001',
      tz: 'Asia/Riyadh',
      profile_id: 'student-profile',
      guardian: { id: 'g1', profile_id: 'guardian-profile' },
    },
    teacher: { display_name_ar: 'أبرار', profile_id: 'teacher-profile' },
  };
}
