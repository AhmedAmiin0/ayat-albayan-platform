import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { usersGet } from '../shared/fixtures';
import { UsersScreen } from './UsersScreen';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

test('an English run reads en.json: title, count, new, filters, status', async () => {
  expect(t).toEqual(en);
  mockApiFetch.mockImplementation(usersGet());
  await renderWithQuery(<UsersScreen can={() => true} />);
  expect(await screen.findByRole('header', { name: `${en.users.title} · 2` })).toBeTruthy();
  expect(screen.getByRole('button', { name: en.users.new })).toBeTruthy();
  expect(screen.getByRole('tab', { name: en.activity.roles.admin })).toBeTruthy();
  expect(screen.getAllByText(en.users.status.disabled).length).toBeGreaterThan(0);
  expect(screen.getByLabelText(en.users.searchPlaceholder)).toBeTruthy();
});
