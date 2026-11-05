import { FULL_GRADES, LESSON_ID, TEACHER_ID } from '@/modules/reporting/reports/reports.fakes';
import { LINK_SECRET } from '@/modules/reporting/reports/test-app';
import { signTeacherLink, teacherLinkExpiry } from './teacher-link.token';

// Test-only: the teacher report link of the reports fixtures' lesson (14:00–14:45 on 2026-10-04).

export const OTHER_LESSON = '00000000-0000-4000-8000-0000000000d9';
export const LINK_EXP = teacherLinkExpiry('2026-10-04T14:45:00+00:00', 24);

interface LinkOver {
  lessonId?: string;
  teacherId?: string;
  secret?: string;
}

export const linkToken = (over: LinkOver = {}): string =>
  signTeacherLink(over.secret ?? LINK_SECRET, {
    lessonId: over.lessonId ?? LESSON_ID,
    teacherId: over.teacherId ?? TEACHER_ID,
    exp: LINK_EXP,
  });

export const linkBase = (token = linkToken()): string => `/public/teacher-report/${token}`;

/** A complete v1 submit (the texts the old Google form required). */
export const LINK_FORM = {
  attendance: 'on_time',
  grades: FULL_GRADES,
  overall: 'excellent',
  recited: 'الفاتحة',
  newMemorization: 'الملك 1-5',
  revision: 'جزء عم',
  notes: 'ممتازة',
  homework: 'سورة الملك',
  expectedVersion: 0,
};
