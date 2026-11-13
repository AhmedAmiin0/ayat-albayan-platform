import type { ReportSummaryView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ReportsPane } from './ReportsPane';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
const mockPush = jest.fn();
jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => true }));
jest.mock('expo-router', () => ({
  router: { push: (h: string) => mockPush(h), back: jest.fn(), replace: jest.fn() },
}));

const row = (over: Partial<ReportSummaryView>): ReportSummaryView => ({
  id: 'r1',
  lesson_id: 'l-1',
  starts_at: '2026-09-29T13:00:00Z',
  lesson_no: 12,
  teacher: { id: 't-abrar', display_name_ar: 'أبرار' },
  attendance: 'on_time',
  grade_overall: 'excellent',
  status: 'submitted',
  version: 1,
  pdf_status: 'ready',
  sent_at: null,
  ...over,
});
// Mine with its PDF, and an older one by another teacher (absent, no grades, PDF not ready).
const other = row({
  id: 'r0',
  lesson_id: 'l-0',
  lesson_no: 11,
  teacher: { id: 't-x', display_name_ar: 'سارة' },
  attendance: 'absent',
  grade_overall: null,
  pdf_status: 'rendering',
});
const lessonNo = (n: string) => t.reports.lessonNoShort.replace('{n}', n);
const mine = { admin: false, teacherId: 't-abrar' } as const;

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (p: string) =>
    p.endsWith('/pdf')
      ? { url: 'https://x/r1.pdf', expires_at: '2026-10-02T10:00:00Z' }
      : { items: [row({}), other], total: 2, page: 1, pageSize: 10, series: [] },
  );
});

test('sent reports newest first, lesson no. + grade, the PDF once ready', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await renderWithQuery(<ReportsPane id="s1" who={mine} />);
  expect(await screen.findByText(`${lessonNo('12')} · ${t.enums.grade.excellent}`)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/students/s1/reports?page=1&pageSize=10');
  expect(screen.getByText(`${lessonNo('11')} · ${t.enums.attendance.absent}`)).toBeTruthy();
  expect(screen.getAllByText(t.reports.downloadPdf)).toHaveLength(1);
  await fireEvent.press(screen.getByText(t.reports.downloadPdf));
  await waitFor(() => expect(open).toHaveBeenCalledWith('https://x/r1.pdf'));
  expect(mockApiFetch).toHaveBeenCalledWith('/reports/r1/pdf');
  open.mockRestore();
});

test('her own lesson’s report opens its form; another teacher’s stays a line', async () => {
  await renderWithQuery(<ReportsPane id="s1" who={mine} />);
  await fireEvent.press(await screen.findByText(new RegExp(t.enums.attendance.absent)));
  expect(mockPush).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText(new RegExp(t.enums.grade.excellent)));
  expect(mockPush).toHaveBeenCalledWith('/teacher/reports/l-1');
});

test('the teacher gets the recordings way; it opens her recordings route', async () => {
  await renderWithQuery(<ReportsPane id="s1" who={mine} />);
  await fireEvent.press(await screen.findByText(t.mobileStudentFile.recordings.button));
  expect(mockPush).toHaveBeenCalledWith('/teacher/reports/student/recordings/s1');
});

test('no report yet: the empty line', async () => {
  mockApiFetch.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, series: [] });
  await renderWithQuery(<ReportsPane id="s1" who={mine} />);
  expect(await screen.findByText(t.reports.noReports)).toBeTruthy();
});

test('the teacher’s zone when given: 13:00Z reads 22:00 in Tokyo', async () => {
  await renderWithQuery(<ReportsPane id="s1" who={mine} tz="Asia/Tokyo" />);
  expect((await screen.findAllByText(/22:00/)).length).toBeGreaterThan(0);
});
