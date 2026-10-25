import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { DashboardScreen } from './DashboardScreen';
import { summary, work } from './fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (h: string) => mockPush(h),
    back: jest.fn(),
    canGoBack: () => true,
    replace: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (p: string) =>
    p.startsWith('/dashboard/summary') ? summary : work,
  );
});

test('KPI tiles with the API’s figures; the week is asked of the summary', async () => {
  await renderWithQuery(<DashboardScreen />);
  expect(
    await screen.findByRole('button', { name: `${t.dashboard.pendingReports}: 2` }),
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: `${t.dashboard.tasks}: 1` })).toBeTruthy();
  expect(screen.getByText('41')).toBeTruthy();
  const url = String(
    mockApiFetch.mock.calls.find(([p]) => String(p).startsWith('/dashboard/summary'))?.[0],
  );
  expect(url).toMatch(/^\/dashboard\/summary\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/);
});

test('pending reports first; a row opens that student’s report history; «و{n} أخرى» when truncated', async () => {
  await renderWithQuery(<DashboardScreen />);
  await fireEvent.press(await screen.findByText('سارة أحمد'));
  expect(mockPush).toHaveBeenCalledWith('/students/reports/s1');
  expect(screen.getByText(t.dashboard.more.replace('{n}', '21'))).toBeTruthy();
});

test('the unpaid and task tiles switch the list; their rows open the student', async () => {
  await renderWithQuery(<DashboardScreen />);
  await fireEvent.press(
    await screen.findByRole('button', { name: `${t.dashboard.unpaidSubscriptions}: 0` }),
  );
  await fireEvent.press(await screen.findByText('يوسف'));
  expect(mockPush).toHaveBeenCalledWith('/students/s2');
  await fireEvent.press(screen.getByRole('button', { name: `${t.dashboard.tasks}: 1` }));
  await fireEvent.press(await screen.findByText(new RegExp('سارة أحمد')));
  expect(mockPush).toHaveBeenLastCalledWith('/students/s1');
});

test('an empty queue says so', async () => {
  const none = { total: 0, items: [] };
  mockApiFetch.mockImplementation(async (p: string) =>
    p.startsWith('/dashboard/summary')
      ? summary
      : { pending_reports: none, unpaid: none, tasks: none },
  );
  await renderWithQuery(<DashboardScreen />);
  expect(await screen.findByRole('header', { name: t.dashboard.noPendingReports })).toBeTruthy();
});

test('nothing cached and the API down: the error state with retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<DashboardScreen />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(mockApiFetch.mock.calls.length).toBeGreaterThan(2);
});
