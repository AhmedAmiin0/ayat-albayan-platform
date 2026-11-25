import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { confirmingQueryClient, renderWithQuery } from '@/test/query';
import TodayRoute from '../../app/(tabs)/index';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('@/notifications/BellButton', () => ({ BellButton: () => null }));
jest.mock('@/today/requests/FamilyRequests', () => ({ FamilyRequests: () => null }));
jest.mock('@ab/mobile-kit/lib/profile/my-profile', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/profile/my-profile'),
  useMyProfile: () => ({ data: undefined }),
}));

beforeEach(() => {
  mockApiFetch.mockReset();
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

test("the day's page sits in the LazyList, with pull to refresh", async () => {
  mockApiFetch.mockResolvedValue([]);
  await renderWithQuery(<TodayRoute />, confirmingQueryClient());
  expect(await screen.findByRole('header', { name: t.today.greeting.afternoon })).toBeTruthy();
  const list = screen.getByTestId('today-list');
  // FlatList's VirtualizedList hands its scroll view getItemCount; FlashList does not.
  expect(list.props.getItemCount).toBeUndefined();
  expect(list.props.refreshControl).toBeTruthy();
});
