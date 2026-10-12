import { screen } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { BellButton } from './BellButton';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: jest.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20, unread: 4 })),
}));

test('the bell reads in English', async () => {
  await renderWithQuery(<BellButton tree="admin" />);
  expect(await screen.findByRole('button', { name: 'Notifications, 4 unread' })).toBeTruthy();
  expect(screen.getByText('4', { includeHiddenElements: true })).toBeTruthy();
});
