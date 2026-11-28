import { studentProfileFixture } from '@ab/shared/testing';
import { screen } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { StudentReportsScreen } from '@/teacher/screens/StudentReportsScreen/StudentReportsScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

const NOTE = 'التواصل مع أسرة طالب التجربة يكون عبر المبيعات.';

test('the admin’s view of a trial student never shows the teacher’s note (no /teachers/me read)', async () => {
  mockApi.onRead(async ({ path: p }) =>
    p === '/students/s1'
      ? studentProfileFixture({ id: 's1', name: 'يوسف أحمد', status: 'trial' })
      : { items: [], total: 0, page: 1, pageSize: 10, series: [] },
  );
  await renderWithQuery(<StudentReportsScreen />);
  expect(await screen.findByRole('header', { name: 'يوسف أحمد' })).toBeTruthy();
  expect(screen.queryByText(NOTE)).toBeNull();
  expect(mockApi.reads()).not.toContainEqual({ method: 'GET', path: '/teachers/me' });
});
