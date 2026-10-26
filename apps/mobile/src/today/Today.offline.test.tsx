import { act, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import TodayRoute from '../../app/(tabs)/index';
import { pending } from './testing/fixtures';

// Today's saved day offline (R-MOB-03) and pull to refresh.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
// The bell reads its own API (notifications/BellButton.test); here it would take the day's mocked answers.
jest.mock('@/notifications/BellButton', () => ({ BellButton: () => null }));

const dayKey = ['lessons', 'day', { date: '2026-10-01', tz: 'Asia/Riyadh' }];
const dayCalls = () =>
  mockApiFetch.mock.calls.filter(([path]: [string]) => path.startsWith('/lessons/day')).length;

beforeEach(() => {
  mockApiFetch.mockReset();
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

test('offline with a saved day: lessons stay, no error, and «آخر تحديث» says how old', async () => {
  mockApiFetch.mockRejectedValue(new ApiError(503));
  const client = createTestQueryClient();
  client.setQueryData(dayKey, [pending]);
  await renderWithQuery(<TodayRoute />, client);
  expect(screen.getByText('يوسف أحمد')).toBeTruthy();
  expect(await screen.findByText(new RegExp(t.mobile.lastUpdated.replace(' {time}', '')))).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});

test('pull to refresh asks the API again', async () => {
  mockApiFetch.mockResolvedValue([pending]);
  const { container } = await renderWithQuery(<TodayRoute />);
  await screen.findByText('يوسف أحمد');
  const [scroll] = container.queryAll((node) => node.props['refreshControl'] !== undefined);
  const control = scroll?.props['refreshControl'] as { props: { onRefresh: () => void } } | undefined;
  if (!control) throw new Error('no pull-to-refresh on the list');
  await act(async () => control.props.onRefresh());
  await waitFor(() => expect(dayCalls()).toBe(2));
});
