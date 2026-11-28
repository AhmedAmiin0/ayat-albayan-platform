import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { balanceOf, page, subscription, SUB_ID } from '@/payments/fixtures';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { BalanceCard } from '@/students/profile/BalanceCard/BalanceCard';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const e = t.salesMoney.usedBeforeEdit;
const STATE = `/subscriptions/${SUB_ID}/lessons-used-before`;
const STATE_BODY = { subscription_id: SUB_ID, lessons_used_before: 0, max: 3, blocked: null };
const ME = {
  role: 'admin',
  permissions: ['students.read', 'subscriptions.read', 'subscriptions.set_start_date'],
};

function serve(me?: object) {
  mockApi.onRead(async ({ path }) => {
    if (path === '/auth/me' && me) return me;
    if (path === '/students/s1/balance')
      return balanceOf(subscription({ starts_on: '2026-01-01' }));
    if (path === '/settings') return { renewal_alert_remaining: 2 };
    if (path === STATE) return STATE_BODY;
    return page([]);
  });
}

beforeEach(() => mockApi.reset('read'));

test('the current package offers the edit, which opens on the server state', async () => {
  serve();
  await renderWithQuery(<BalanceCard studentId="s1" />);
  await fireEvent.press(await screen.findByRole('button', { name: e.action }));
  expect(await screen.findByLabelText(`${t.salesMoney.usedBefore}: 0`)).toBeTruthy();
  expect(mockApi.reads()).toContainEqual({ method: 'GET', path: STATE });
});

test('without subscriptions.edit_terms: not offered', async () => {
  serve(ME);
  await renderWithQuery(<BalanceCard studentId="s1" />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByText(t.subscriptions.balance)).toBeTruthy();
  expect(screen.queryByRole('button', { name: e.action })).toBeNull();
});
