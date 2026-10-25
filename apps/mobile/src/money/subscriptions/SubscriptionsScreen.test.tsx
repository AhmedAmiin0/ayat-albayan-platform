import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { page, STUDENT, subscription } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/core/ui/primitives/Ltr';
import { adminTask } from '../shared/fixtures';
import { SubscriptionsScreen } from './SubscriptionsScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (mockHref: string) => mockPush(mockHref), back: jest.fn() },
}));

const due = subscription({ id: 'a', status: 'active', paid: 145 });
const roomy = subscription({
  id: 'b',
  status: 'active',
  paid: 50,
  student: { ...STUDENT, id: 's2', name: 'يوسف', code: 'AB-0201' },
  balance: { ...subscription().balance, lessons_used: 1, remaining: 3 },
});

function backend(subs = [due, roomy], tasks = [adminTask()]) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/settings') return { renewal_alert_remaining: 2 };
    if (path.startsWith('/admin-tasks')) return page(tasks);
    return page(subs);
  });
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockPush.mockReset();
});

test('packages: student, code, status word; the renewal-due one is flagged, the roomy one is not', async () => {
  backend();
  await renderWithQuery(<SubscriptionsScreen />);
  expect(await screen.findByText('يوسف')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/subscriptions?page=1&pageSize=25');
  expect(screen.getAllByText(ltr('AB-0183')).length).toBe(1);
  expect(screen.getAllByText(t.enums.subscriptionStatus.active)).toHaveLength(3); // the filter chip and the two rows
  await waitFor(() => expect(screen.getAllByText(new RegExp(t.mobileMoney.renewalDue))).toHaveLength(1));
});

test('«سجّل دفعة» only on a package not fully paid, and it opens the existing payment form', async () => {
  backend();
  await renderWithQuery(<SubscriptionsScreen />);
  await screen.findByText('يوسف');
  expect(screen.getAllByLabelText(new RegExp(`^${t.mobileMoney.recordPayment} ·`))).toHaveLength(1);
  await fireEvent.press(screen.getByRole('button', { name: `${t.mobileMoney.recordPayment} · يوسف` }));
  expect(mockPush).toHaveBeenCalledWith('/students/payment/s2');
});

test('a row opens the student', async () => {
  backend();
  await renderWithQuery(<SubscriptionsScreen />);
  await fireEvent.press(await screen.findByText('يوسف'));
  expect(mockPush).toHaveBeenCalledWith('/students/s2');
});

test('status chips filter on the server: a status, then «مدفوعة جزئيًا»', async () => {
  backend();
  await renderWithQuery(<SubscriptionsScreen />);
  await screen.findByText('يوسف');
  await fireEvent.press(screen.getByRole('tab', { name: t.enums.subscriptionStatus.unpaid }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/subscriptions?status=unpaid&page=1&pageSize=25'));
  await fireEvent.press(screen.getByRole('tab', { name: t.mobileMoney.filterPartial }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/subscriptions?paid=partial&page=1&pageSize=25'));
});

test('the student search goes to the server as ?student=', async () => {
  backend();
  await renderWithQuery(<SubscriptionsScreen />);
  await screen.findByText('يوسف');
  const field = screen.getByLabelText(t.mobileMoney.searchStudent);
  await fireEvent.changeText(field, 'يوسف');
  await fireEvent(field, 'submitEditing');
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('student=')));
});

test('«المهام» lists the open admin tasks and opens the student', async () => {
  backend();
  await renderWithQuery(<SubscriptionsScreen />);
  await fireEvent.press(await screen.findByRole('tab', { name: t.mobileMoney.viewTasks }));
  expect(await screen.findByText(new RegExp(t.mobileMoney.taskRenewalDue))).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/admin-tasks?open=true&page=1&pageSize=25');
  expect(screen.getByText(t.mobileMoney.taskNeedsAction)).toBeTruthy();
  await fireEvent.press(screen.getByText('هدى'));
  expect(mockPush).toHaveBeenCalledWith('/students/s1');
});

test('empty packages and empty tasks say so', async () => {
  backend([], []);
  await renderWithQuery(<SubscriptionsScreen />);
  expect(await screen.findByRole('header', { name: t.mobileMoney.subscriptionsEmpty })).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: t.mobileMoney.viewTasks }));
  expect(await screen.findByRole('header', { name: t.mobileMoney.tasksEmpty })).toBeTruthy();
});

test('failed with nothing cached: error + retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<SubscriptionsScreen />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  backend();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByText('يوسف')).toBeTruthy();
});
