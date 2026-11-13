import {
  PUBLIC_SETTING_DEFAULTS,
  type AttendanceTableRow,
  type ReportSummaryView,
  type StudentAttendanceTable,
  type StudentRecordingView,
  type TeacherCourseView,
  type TeacherStudentHead,
} from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { Mock } from 'vitest';
import { TeacherStudentFile } from './TeacherStudentFile';
import type { FileTab } from './file-tabs';

// Test helper (not a test): «ملف الطالب» fixtures and a render that answers every read it makes.

export const COURSE: TeacherCourseView = {
  starts_on: '2026-09-01',
  stopped_at: null,
  ended_at: null,
  projected_end_at: null,
  lessons_total: 8,
  lessons_used: 5,
  lessons_remaining: 3,
};

export const upcomingRow = (over: Partial<AttendanceTableRow> = {}): AttendanceTableRow => ({
  lesson_id: 'u-1',
  starts_at: '2026-10-10T13:00:00.000Z',
  duration_min: 45,
  teacher_name: 'أبرار',
  status: 'scheduled',
  attendance: null,
  kind: null,
  report_sent: false,
  report_id: null,
  cancel_reason: null,
  is_trial: false,
  is_makeup: false,
  is_rescheduled: false,
  ...over,
});

export const HEAD: TeacherStudentHead = {
  id: 's-1',
  code: 'AB-0183',
  name: 'سهيلة',
  status: 'active',
  course: COURSE,
  upcoming: [
    upcomingRow(),
    upcomingRow({ lesson_id: 'u-2', status: 'cancelled_by_admin', cancel_reason: 'سفر الأسرة' }),
  ],
};

const LOG: StudentAttendanceTable = {
  month: '2026-10',
  months: ['2026-10'],
  items: [],
  mine: true,
  totals: {
    held: 0, late: 0, absent: 0, excused: 0,
    cancelled_by_teacher: 0, cancelled_by_admin: 0, rescheduled: 0, unmarked: 0,
  },
};

const report: ReportSummaryView = {
  id: 'r-1',
  lesson_id: 'l-9',
  starts_at: '2026-10-03T13:00:00.000Z',
  lesson_no: 7,
  teacher: { id: 't-1', display_name_ar: 'أبرار' },
  attendance: 'on_time',
  grade_overall: 'very_good',
  status: 'submitted',
  version: 1,
  pdf_status: 'ready',
  sent_at: null,
};

const pending = (lessonId: string, student: { id: string; code: string; name: string }) => ({
  lesson_id: lessonId,
  starts_at: '2026-10-08T13:00:00.000Z',
  status: 'completed',
  report_id: null,
  student,
});
const PENDING = [
  pending('l-1', { id: 's-1', code: 'AB-0183', name: 'سهيلة' }),
  pending('l-2', { id: 's-2', code: 'AB-0184', name: 'آية' }),
];
const REPORTS = { items: [report], total: 1, page: 1, pageSize: 10, series: [] };
const recording: StudentRecordingView = {
  id: 'rec-9',
  lesson_id: 'l-9',
  lesson_starts_at: '2026-10-03T13:00:00.000Z',
  started_at: '2026-10-03T13:00:00.000Z',
  teacher: { id: 't-1', display_name_ar: 'أبرار', display_name_en: 'Abrar' },
  status: 'done',
  duration_seconds: 2700,
  size_bytes: 1_048_576,
  media: 'video',
  visible_to_student: false,
  can_manage: true,
  url: 'https://signed.example.test/r.mp4',
};
const RECORDINGS = { items: [recording], total: 1, page: 1, pageSize: 10 };

type Answer = readonly [match: (path: string) => boolean, body: () => unknown];

const answers = (head: () => unknown): Answer[] => [
  [(p) => p === '/settings/public', () => ({ ...PUBLIC_SETTING_DEFAULTS, custom: {} })],
  [(p) => p === '/teachers/me/students/s-1', head],
  [(p) => p.startsWith('/teachers/me/students/s-1/attendance'), () => LOG],
  [(p) => p === '/teachers/me/pending-reports', () => PENDING],
  [(p) => p === '/teachers/me', () => ({ tz: 'Africa/Cairo', students: [] })],
  [(p) => p.startsWith('/students/s-1/reports'), () => REPORTS],
  [(p) => p.endsWith('/recorded-lesson-ids'), () => ['l-9']],
  [(p) => p.startsWith('/students/s-1/recordings'), () => RECORDINGS],
];

export interface RenderFileOptions {
  apiFetch: Mock;
  tab?: FileTab;
  /** The head's answer: a value, or a function that throws (an ApiError). */
  head?: () => unknown;
  onTab?: (tab: FileTab) => void;
}

/** Renders the file for student s-1, every read answered from the fixtures above. */
export function renderFile(o: RenderFileOptions) {
  const table = answers(o.head ?? (() => HEAD));
  const answer = (path: string) => table.find(([match]) => match(path))?.[1]() ?? [];
  o.apiFetch.mockImplementation(async (path: string) => answer(path));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onTab = o.onTab ?? (() => undefined);
  return render(
    <QueryClientProvider client={client}>
      <TeacherStudentFile studentId="s-1" tab={o.tab ?? 'lessons'} onTab={onTab} />
    </QueryClientProvider>,
  );
}
