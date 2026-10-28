import { emptyContent } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { AdminReportScreen } from './AdminReportScreen';
import { report } from '../shared/fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ reportId: 'r1' }),
}));

const v2 = t.reports.v2;
const content = {
  ...emptyContent(),
  segments: [
    { kind: 'recited' as const, surah: 67, from: 1, to: 15, grade: 'excellent' as const },
    { kind: 'new' as const, surah: 67, from: 16, to: 22, grade: null },
  ],
  tajweed: 'madd' as const,
  quick: ['keep_going' as const],
};

test('a new-form report: badge, attendance, parts with range and grade, tajweed, note', async () => {
  mockApiFetch.mockResolvedValue(report({ form_version: 2, content, notes: 'تحسّن واضح' }));
  await renderWithQuery(<AdminReportScreen />);
  expect(await screen.findByText(v2.admin.v2Badge)).toBeTruthy();
  expect(screen.getByText(v2.attendance.on_time)).toBeTruthy();
  expect(screen.getByText(`سورة الملك · الآيات 1–15 · ${t.enums.grade.excellent}`)).toBeTruthy();
  expect(screen.getByText('سورة الملك · الآيات 16–22')).toBeTruthy();
  expect(screen.getByText(v2.tajweed.madd)).toBeTruthy();
  expect(screen.getByText('أحسنت، استمر. تحسّن واضح')).toBeTruthy();
  expect(screen.queryByText(t.reports.recited)).toBeNull();
});

test('absent: the attendance line and the note only', async () => {
  mockApiFetch.mockResolvedValue(report({ form_version: 2, content: emptyContent(), attendance: 'absent', notes: 'نرجو الإبلاغ' }));
  await renderWithQuery(<AdminReportScreen />);
  expect(await screen.findByText(v2.attendance.absent)).toBeTruthy();
  expect(screen.getByText('نرجو الإبلاغ')).toBeTruthy();
  expect(screen.queryByText(v2.overall)).toBeNull();
});

test('a v1 report reads as before, without the badge', async () => {
  mockApiFetch.mockResolvedValue(report());
  await renderWithQuery(<AdminReportScreen />);
  expect(await screen.findByText(t.reports.recited)).toBeTruthy();
  expect(screen.queryByText(v2.admin.v2Badge)).toBeNull();
});
