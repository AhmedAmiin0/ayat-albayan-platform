import { screen } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { StudentReportsScreen } from './StudentReportsScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

const NOTE = 'التواصل مع أسرة طالب التجربة يكون عبر المبيعات.';

test('the admin’s view of a trial student never shows the teacher’s note (no /teachers/me read)', async () => {
  mockApiFetch.mockImplementation(async (p: string) =>
    p === '/students/s1'
      ? { id: 's1', name: 'يوسف أحمد', status: 'trial' }
      : { items: [], total: 0, page: 1, pageSize: 10, series: [] },
  );
  await renderWithQuery(<StudentReportsScreen />);
  expect(await screen.findByRole('header', { name: 'يوسف أحمد' })).toBeTruthy();
  expect(screen.queryByText(NOTE)).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalledWith('/teachers/me');
});
