import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { DashboardScreen } from '@/ops/dashboard/DashboardScreen/DashboardScreen';
import { summary as mockSummary, work as mockWork } from '@/ops/shared/fixtures';
import { mockCall } from '@ab/testing/mock-call';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApi = mockCall();
mockApi.onRead(async ({ path: p }) =>
  p.startsWith('/dashboard/summary') ? mockSummary : mockWork,
);
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), canGoBack: () => true, back: jest.fn() },
}));

test('English: titles, tiles and rows read from en.json', async () => {
  expect(t).toEqual(en);
  await renderWithQuery(<DashboardScreen />);
  expect(screen.getByRole('header', { name: en.mobileAdmin.dashboard.title })).toBeTruthy();
  expect(
    await screen.findByRole('button', { name: `${en.dashboard.pendingReports}: 2` }),
  ).toBeTruthy();
  expect(screen.getByText(en.mobileAdmin.dashboard.activeStudents)).toBeTruthy();
});
