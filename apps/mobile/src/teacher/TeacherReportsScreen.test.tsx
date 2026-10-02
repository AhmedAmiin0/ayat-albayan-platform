import type { PendingReportView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { TeacherReportsScreen } from './TeacherReportsScreen';
import type { TeacherReportView } from './types';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: (p: string) => mockApiFetch(p) }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (h: string) => mockPush(h) } }));

const student = { id: 's1', code: 'AB-0182', name: 'يوسف أحمد' };
const me = { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [{ ...student, tz: 'Asia/Riyadh', status: 'active' }] };
const pending: PendingReportView[] = [
  { lesson_id: 'l-new', starts_at: '2026-10-01T13:00:00Z', status: 'scheduled', student, report_id: null },
  { lesson_id: 'l-draft', starts_at: '2026-09-30T13:00:00Z', status: 'scheduled', student: { ...student, id: 's2', name: 'جنى وليد' }, report_id: 'r-d' },
];
const sent = (over: Partial<TeacherReportView>): TeacherReportView => ({
  id: 'r1',
  lesson_id: 'l-1',
  starts_at: '2026-09-29T13:00:00Z',
  student,
  attendance: 'on_time',
  grade_overall: 'excellent',
  status: 'submitted',
  submitted_at: '2026-09-29T14:00:00Z',
  can_edit: true,
  edit_until: '2026-09-30T14:00:00Z',
  pdf_status: 'ready',
  sent_at: null,
  ...over,
});
const submitted = [sent({}), sent({ id: 'r2', lesson_id: 'l-2', student: { ...student, name: 'سلمى' }, can_edit: false })];

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/teachers/me') return me;
    if (p === '/teachers/me/pending-reports') return pending;
    return { items: submitted, total: 2, page: 1, pageSize: 25 };
  });
});

test('pending: «اكتب التقرير», or «تعديل التقرير» for a draft; a row opens the lesson’s form', async () => {
  await renderWithQuery(<TeacherReportsScreen />);
  expect(await screen.findByText(t.reports.open)).toBeTruthy();
  expect(screen.getByText(t.reports.edit)).toBeTruthy();
  await fireEvent.press(screen.getByText('جنى وليد'));
  expect(mockPush).toHaveBeenCalledWith('/teacher/reports/l-draft');
});

test('sent: newest first from /teachers/me/reports, edit inside the window, else view', async () => {
  await renderWithQuery(<TeacherReportsScreen />);
  await fireEvent.press(await screen.findByRole('tab', { name: t.reports.submittedTitle }));
  expect(await screen.findByText('سلمى')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/reports?page=1&pageSize=25');
  expect(screen.getByText(t.reports.edit)).toBeTruthy();
  expect(screen.getByText(t.reports.view)).toBeTruthy();
  expect(screen.getAllByText(new RegExp(t.enums.grade.excellent))).toHaveLength(2);
  await fireEvent.press(screen.getByText('سلمى'));
  expect(mockPush).toHaveBeenCalledWith('/teacher/reports/l-2');
});

test('my students: each opens their «سجل التقارير»', async () => {
  await renderWithQuery(<TeacherReportsScreen />);
  await fireEvent.press(await screen.findByRole('tab', { name: t.teacherDash.myStudents }));
  await fireEvent.press(await screen.findByText(t.reports.history));
  expect(mockPush).toHaveBeenCalledWith('/teacher/reports/student/s1');
});

test('nothing pending and nothing sent yet: each list says so', async () => {
  mockApiFetch.mockImplementation(async (p: string) =>
    p === '/teachers/me' ? me : p.endsWith('pending-reports') ? [] : { items: [], total: 0, page: 1, pageSize: 25 },
  );
  await renderWithQuery(<TeacherReportsScreen />);
  expect(await screen.findByText(t.reports.noPending)).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: t.reports.submittedTitle }));
  expect(await screen.findByText(t.reports.submittedEmpty)).toBeTruthy();
});
