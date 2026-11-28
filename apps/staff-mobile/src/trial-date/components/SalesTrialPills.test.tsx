import type { StudentStatus } from '@ab/catalog';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { SalesChatActions } from '@/inbox/leads/sales/SalesChatActions';
import { t } from '@ab/mobile-kit';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { familyOf, familyThread, KID, KID2, kid } from '@/sales-subscribe/testing/fixtures';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { mockCall } from '@ab/testing/mock-call';

// One trial pill for her students with no running subscription.
const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (h: unknown) => mockPush(h) } }));

function serve(...students: ReturnType<typeof kid>[]) {
  const family = familyOf(...students);
  mockApi.onRead(async ({ path: p }) =>
    p === '/auth/me' ? { permissions: ['self.sales', 'self.sales_money'] } : family,
  );
}
async function open() {
  await renderWithQuery(
    <TreeBaseProvider value="/sales">
      <SalesChatActions thread={familyThread} />
    </TreeBaseProvider>,
    createTestQueryClient({ meFromApi: true }),
  );
  return within(await screen.findByTestId('sales-chat-actions'));
}

beforeEach(() => jest.clearAllMocks());

test.each(['new', 'trial', 'pending_subscription'] as const)(
  '%s: the pill opens the trial-date route inside the sales chat group',
  async (status) => {
    serve(kid({ status }));
    const strip = await open();
    await fireEvent.press(strip.getByRole('button', { name: `${t.trialDate.action} — ريم` }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/sales/inbox/trial-date',
      params: { studentId: KID, name: 'ريم' },
    });
  },
);

test.each(['active', 'pending_renewal', 'expired'] as StudentStatus[])(
  '%s: no trial pill (a subscriber changes the course instead)',
  async (status) => {
    serve(kid({ status }));
    const strip = await open();
    expect(strip.getByRole('button', { name: t.salesMoney.newSubscription })).toBeTruthy();
    expect(strip.queryByRole('button', { name: new RegExp(`^${t.trialDate.action}`) })).toBeNull();
  },
);

// One pill, then a sheet names each allowed child.
test('several of hers: ONE pill; its sheet lists each allowed child and opens the one picked', async () => {
  serve(
    kid(),
    kid({ id: KID2, name: 'سلمى', status: 'active' }),
    kid({ id: 'k3', code: 'AB-0202', name: 'نور', status: 'new' }),
  );
  const strip = await open();
  expect(strip.getAllByRole('button', { name: new RegExp(`^${t.trialDate.action}`) })).toHaveLength(
    1,
  );
  await fireEvent.press(strip.getByRole('button', { name: t.trialDate.action }));
  const sheet = within(screen.getByTestId('trial-student-sheet'));
  expect(sheet.queryByRole('button', { name: /سلمى/ })).toBeNull();
  await fireEvent.press(sheet.getByRole('button', { name: 'نور · AB-0202' }));
  await waitFor(() =>
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/sales/inbox/trial-date',
      params: { studentId: 'k3', name: 'نور' },
    }),
  );
});
