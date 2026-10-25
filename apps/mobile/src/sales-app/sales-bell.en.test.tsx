import { screen } from '@testing-library/react-native';
import { InboxScreen } from '@/inbox/InboxScreen';
import { thread } from '@/inbox/shared/thread-fixtures';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { renderWithQuery } from '@/test/query';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));

test('the sales inbox bell reads in English', async () => {
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/auth/me') return { role: 'sales', permissions: ['inbox.read', 'notifications.push'] };
    if (p.startsWith('/me/notifications')) return { items: [], total: 0, page: 1, pageSize: 20, unread: 5 };
    return { items: [thread], total: 1 };
  });
  await renderWithQuery(
    <TreeBaseProvider value="/sales">
      <InboxScreen />
    </TreeBaseProvider>,
  );
  expect(await screen.findByRole('button', { name: 'Notifications, 5 unread' })).toBeTruthy();
});
