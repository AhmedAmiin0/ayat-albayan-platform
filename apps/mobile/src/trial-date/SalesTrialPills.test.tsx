import type { StudentStatus } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { SalesChatActions } from '@/inbox/SalesChatActions';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/nav/tree-base';
import { familyOf, familyThread, KID, KID2, kid } from '@/sales-subscribe/fixtures';
import { renderWithQuery } from '@/test/query';

// The salesperson's family chat: «موعد تجريبي جديد» per student of hers with no running subscription.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (h: unknown) => mockPush(h) } }));

function serve(...students: ReturnType<typeof kid>[]) {
  const family = familyOf(...students);
  mockApiFetch.mockImplementation(async (p: string) => (p === '/auth/me' ? { permissions: ['self.sales', 'self.sales_money'] } : family));
}
async function open() {
  await renderWithQuery(
    <TreeBaseProvider value="/sales">
      <SalesChatActions thread={familyThread} />
    </TreeBaseProvider>,
  );
  return within(await screen.findByTestId('sales-chat-actions'));
}

beforeEach(() => jest.clearAllMocks());

test.each(['new', 'trial', 'pending_subscription'] as const)('%s: the pill opens the trial-date route inside the sales chat group', async (status) => {
  serve(kid({ status }));
  const strip = await open();
  await fireEvent.press(strip.getByRole('button', { name: `${t.trialDate.action} — ريم` }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/sales/inbox/trial-date', params: { studentId: KID, name: 'ريم' } });
});

test.each(['active', 'pending_renewal', 'expired'] as StudentStatus[])('%s: no trial pill (a subscriber changes the course instead)', async (status) => {
  serve(kid({ status }));
  const strip = await open();
  expect(strip.getByRole('button', { name: t.salesMoney.newSubscription })).toBeTruthy();
  expect(strip.queryByRole('button', { name: new RegExp(`^${t.trialDate.action}`) })).toBeNull();
});

test('two of hers: one pill per allowed child, named', async () => {
  serve(kid(), kid({ id: KID2, name: 'سلمى', status: 'active' }), kid({ id: 'k3', name: 'نور', status: 'new' }));
  const strip = await open();
  expect(strip.getByText(`${t.trialDate.action} — ريم`)).toBeTruthy();
  expect(strip.getByText(`${t.trialDate.action} — نور`)).toBeTruthy();
  expect(strip.queryByText(`${t.trialDate.action} — سلمى`)).toBeNull();
});
