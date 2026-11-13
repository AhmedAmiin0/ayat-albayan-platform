import type { ReportSummaryView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { StudentReportsScreen } from './StudentReportsScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (h: string) => mockPush(h),
    back: jest.fn(),
    canGoBack: () => false,
    canDismiss: () => false,
    replace: (h: string) => mockReplace(h),
  },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

const row: ReportSummaryView = {
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
};

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (p: string) =>
    p === '/students/s1'
      ? { id: 's1', name: 'يوسف أحمد' }
      : { items: [row], total: 1, page: 1, pageSize: 10, series: [] },
  );
});

test('admin only: the student’s name, no recordings way, any report opens read-only', async () => {
  await renderWithQuery(<StudentReportsScreen />);
  expect(await screen.findByRole('header', { name: 'يوسف أحمد' })).toBeTruthy();
  expect(screen.queryByText(t.mobileStudentFile.recordings.button)).toBeNull();
  await fireEvent.press(screen.getByText(new RegExp(t.enums.grade.excellent)));
  expect(mockPush).toHaveBeenCalledWith('/students/reports/view/r1');
});

test('back leads to the admin’s student page, never the teacher tab', async () => {
  await renderWithQuery(<StudentReportsScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.common.back }));
  expect(mockReplace).toHaveBeenCalledWith('/students/s1');
});
