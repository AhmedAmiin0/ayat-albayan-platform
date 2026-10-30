import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { isolate } from '@/core/ui/primitives/Ltr';
import { renderWithQuery } from '@/test/query';
import { ActivityScreen } from './ActivityScreen';
import { activityRow } from '../shared/fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
}));

const page = (items: unknown[], total = items.length, n = 1) => ({
  items,
  total,
  page: n,
  pageSize: 25,
});
const lastUrl = () => String(mockApiFetch.mock.calls.at(-1)?.[0]);

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue(
    page([
      activityRow(),
      activityRow({
        id: 'a2',
        status: 403,
        actor_name: null,
        actor_role: 'public',
        action: 'authSession.loginFailed',
        entity: 'activity',
      }),
    ]),
  );
});

test('rows: action, actor with role, item, Riyadh time and the result', async () => {
  await renderWithQuery(<ActivityScreen />);
  expect(await screen.findByText(t.activity.actions.expenses.create)).toBeTruthy();
  expect(
    screen.getByText(
      new RegExp(`${isolate('منى')} · ${t.activity.roles.admin} · ${t.activity.entities.expenses} · .*16:30`),
    ),
  ).toBeTruthy();
  expect(screen.getByText(t.activity.ok)).toBeTruthy();
  expect(screen.getByText(t.activity.error.replace('{status}', '403'))).toBeTruthy();
  expect(screen.getByText(new RegExp(t.activity.unknownUser))).toBeTruthy();
  expect(lastUrl()).toBe('/activity?page=1&pageSize=25');
  // Owner 2026-10-28: the total on the title's line, «سجل النشاط · 2», no separate count line.
  expect(screen.getByRole('header', { name: `${t.activity.title} · 2` })).toBeTruthy();
});

test('role and item pills filter on the server and reset to page 1', async () => {
  await renderWithQuery(<ActivityScreen />);
  await screen.findByText(t.activity.actions.expenses.create);
  // «معلم/ة» is both a role and an item: the role pills come first.
  await fireEvent.press(screen.getAllByRole('tab', { name: t.activity.roles.teacher })[0] as never);
  await waitFor(() => expect(lastUrl()).toBe('/activity?role=teacher&page=1&pageSize=25'));
  // «طالب» is also a role now (the item pills come last).
  await fireEvent.press(screen.getAllByRole('tab', { name: t.activity.entities.students }).at(-1) as never);
  await waitFor(() => expect(lastUrl()).toContain('entity=students'));
});

test('dates: a valid day is sent, a half-typed one shows the hint and is not sent', async () => {
  await renderWithQuery(<ActivityScreen />);
  await screen.findByText(t.activity.actions.expenses.create);
  await fireEvent.changeText(screen.getByLabelText(t.mobileAdmin.activity.from), '2026-10');
  expect(screen.getByText(t.mobileAdmin.activity.dateInvalid)).toBeTruthy();
  expect(lastUrl()).toBe('/activity?page=1&pageSize=25');
  await fireEvent.changeText(screen.getByLabelText(t.mobileAdmin.activity.from), '2026-10-01');
  await waitFor(() => expect(lastUrl()).toBe('/activity?from=2026-10-01&page=1&pageSize=25'));
});

test('filtered with no match: the filtered empty state, and «مسح التصفية» undoes it', async () => {
  await renderWithQuery(<ActivityScreen />);
  await screen.findByText(t.activity.actions.expenses.create);
  mockApiFetch.mockResolvedValue(page([]));
  await fireEvent.press(screen.getByRole('tab', { name: t.activity.roles.sales }));
  expect(
    await screen.findByRole('header', { name: t.mobileAdmin.activity.emptyFiltered }),
  ).toBeTruthy();
  mockApiFetch.mockResolvedValue(page([activityRow()]));
  await fireEvent.press(screen.getByRole('button', { name: t.mobileAdmin.activity.clear }));
  expect(await screen.findByText(t.activity.actions.expenses.create)).toBeTruthy();
});

test('no activity at all: the honest empty state', async () => {
  mockApiFetch.mockResolvedValue(page([]));
  await renderWithQuery(<ActivityScreen />);
  expect(await screen.findByRole('header', { name: t.activity.empty })).toBeTruthy();
});

test('403 or offline with nothing loaded: the error state', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<ActivityScreen />);
  expect(await screen.findByRole('button', { name: t.mobile.retry })).toBeTruthy();
});
