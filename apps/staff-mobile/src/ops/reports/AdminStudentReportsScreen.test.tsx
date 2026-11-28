import type { ReportSummaryView } from '@ab/shared';
import { studentProfileFixture } from '@ab/shared/testing';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { AdminStudentReportsScreen } from './AdminStudentReportsScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (h: string) => mockPush(h),
    back: jest.fn(),
    canGoBack: () => true,
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

const row: ReportSummaryView = {
  id: 'r1',
  lesson_id: 'l1',
  starts_at: '2026-09-29T13:00:00Z',
  lesson_no: 12,
  teacher: { id: 't-x', display_name_ar: 'سارة' },
  attendance: 'on_time',
  grade_overall: 'excellent',
  status: 'submitted',
  version: 1,
  pdf_status: 'ready',
  sent_at: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.onRead(async ({ path: p }) => {
    if (p === '/students/s1') return studentProfileFixture({ id: 's1', name: 'يوسف أحمد' });
    return { items: [row], total: 1, page: 1, pageSize: 10, series: [] };
  });
});

test('admin mode: the student’s name, no teacher read, any report opens the read-only view', async () => {
  await renderWithQuery(<AdminStudentReportsScreen />);
  expect(await screen.findByRole('header', { name: 'يوسف أحمد' })).toBeTruthy();
  expect(mockApi.reads()).not.toContainEqual({ method: 'GET', path: '/teachers/me' });
  expect(mockApi.reads()).toContainEqual({
    method: 'GET',
    path: '/students/s1/reports?page=1&pageSize=10',
  });
  await fireEvent.press(await screen.findByText(new RegExp(t.enums.grade.excellent)));
  expect(mockPush).toHaveBeenCalledWith('/students/reports/view/r1');
});
