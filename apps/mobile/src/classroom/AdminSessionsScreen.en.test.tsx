import { screen } from '@testing-library/react-native';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { AdminSessionsScreen } from './AdminSessionsScreen';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: jest.fn(async () => [jest.requireActual('@/today/fixtures').lesson({ id: 'now' })]),
  apiSend: jest.fn(),
}));

afterEach(() => jest.useRealTimers());

test('the live board reads in English', async () => {
  fakeNow(new Date('2026-10-01T13:10:00Z'));
  await renderWithQuery(<AdminSessionsScreen />);
  expect(await screen.findByRole('header', { name: 'Live lessons' }, { timeout: 5000 })).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Now 1' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Send the lesson link' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Previous day' })).toBeTruthy();
});
