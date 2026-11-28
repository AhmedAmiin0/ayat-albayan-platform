import { screen } from '@testing-library/react-native';
import { InboxScreen } from '@/inbox/screens/InboxScreen';
import { thread } from '@/inbox/shared/thread-fixtures';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { mockCall } from '@ab/testing/mock-call';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

test('the sales inbox bell reads in English', async () => {
  mockApi.onRead(async ({ path: p }) => {
    if (p === '/auth/me')
      return { role: 'sales', permissions: ['inbox.read', 'notifications.push'] };
    if (p.startsWith('/me/notifications'))
      return { items: [], total: 0, page: 1, pageSize: 20, unread: 5 };
    return { items: [thread], total: 1 };
  });
  await renderWithQuery(
    <TreeBaseProvider value="/sales">
      <InboxScreen />
    </TreeBaseProvider>,
    createTestQueryClient({ meFromApi: true }),
  );
  expect(await screen.findByRole('button', { name: 'Notifications, 5 unread' })).toBeTruthy();
});
