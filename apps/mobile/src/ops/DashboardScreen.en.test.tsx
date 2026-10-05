import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { DashboardScreen } from './DashboardScreen';
import { summary as mockSummary, work as mockWork } from './fixtures';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: async (p: string) => (p.startsWith('/dashboard/summary') ? mockSummary : mockWork),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), canGoBack: () => true, back: jest.fn() },
}));

test('English: titles, tiles and rows read from en.json', async () => {
  expect(t).toBe(en);
  await renderWithQuery(<DashboardScreen />);
  expect(screen.getByRole('header', { name: en.mobileAdmin.dashboard.title })).toBeTruthy();
  expect(
    await screen.findByRole('button', { name: `${en.dashboard.pendingReports}: 2` }),
  ).toBeTruthy();
  expect(screen.getByText(en.mobileAdmin.dashboard.activeStudents)).toBeTruthy();
});
