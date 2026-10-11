import { screen } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { StudentReportsScreen } from './StudentReportsScreen';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: (p: string) => mockApiFetch(p) }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

const NOTE = 'التواصل مع أسرة طالب التجربة يكون عبر المبيعات.';
const kid = (status: 'trial' | 'active') => ({ id: 's1', code: 'AB-0182', name: 'يوسف أحمد', tz: 'Asia/Riyadh', status });
const serve = (status: 'trial' | 'active') =>
  mockApiFetch.mockImplementation(async (p: string) =>
    p === '/teachers/me' ? { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [kid(status)] } : { items: [], total: 0, page: 1, pageSize: 10, series: [] },
  );

beforeEach(() => jest.clearAllMocks());

test('a trial student’s file: the «through sales» note instead of a family contact (owner, 2026-10-11)', async () => {
  serve('trial');
  await renderWithQuery(<StudentReportsScreen />);
  expect(await screen.findByText(NOTE)).toBeTruthy();
});

test('an active student’s file: no note', async () => {
  serve('active');
  await renderWithQuery(<StudentReportsScreen />);
  expect(await screen.findByRole('header', { name: 'يوسف أحمد' })).toBeTruthy();
  expect(screen.queryByText(NOTE)).toBeNull();
});

test('the admin’s view of a student never shows it (no /teachers/me read)', async () => {
  serve('trial');
  await renderWithQuery(<StudentReportsScreen admin />);
  expect(screen.queryByText(NOTE)).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalledWith('/teachers/me');
});
