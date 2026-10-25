import type { ReportSummaryView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { StudentReportsScreen } from './StudentReportsScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (h: string) => mockPush(h), back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

const me = { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [{ id: 's1', code: 'AB-0182', name: 'يوسف أحمد', tz: 'Asia/Riyadh', status: 'active' }] };
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
const items = [row({}), row({ id: 'r0', lesson_id: 'l-0', lesson_no: 11, teacher: { id: 't-x', display_name_ar: 'سارة' }, attendance: 'absent', grade_overall: null, pdf_status: 'rendering' })];

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/teachers/me') return me;
    if (p.endsWith('/pdf')) return { url: 'https://x/r1.pdf', expires_at: '2026-10-02T10:00:00Z' };
    return { items, total: 2, page: 1, pageSize: 10, series: [] };
  });
});

test('«سجل التقارير»: sent reports newest first, lesson no. + grade, the PDF once ready', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await renderWithQuery(<StudentReportsScreen />);
  expect(await screen.findByText(`${t.reports.lessonNoShort.replace('{n}', '12')} · ${t.enums.grade.excellent}`)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/students/s1/reports?page=1&pageSize=10');
  expect(screen.getByRole('header', { name: 'يوسف أحمد' })).toBeTruthy();
  expect(screen.getByText(`${t.reports.lessonNoShort.replace('{n}', '11')} · ${t.enums.attendance.absent}`)).toBeTruthy();
  expect(screen.getAllByText(t.reports.downloadPdf)).toHaveLength(1);
  await fireEvent.press(screen.getByText(t.reports.downloadPdf));
  await waitFor(() => expect(open).toHaveBeenCalledWith('https://x/r1.pdf'));
  expect(mockApiFetch).toHaveBeenCalledWith('/reports/r1/pdf');
  open.mockRestore();
});

test('my own lesson’s report opens its form; another teacher’s stays a line', async () => {
  await renderWithQuery(<StudentReportsScreen />);
  await fireEvent.press(await screen.findByText(new RegExp(t.enums.attendance.absent)));
  expect(mockPush).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText(new RegExp(t.enums.grade.excellent)));
  expect(mockPush).toHaveBeenCalledWith('/teacher/reports/l-1');
});
