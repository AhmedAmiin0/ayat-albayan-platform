import { DEFAULT_RENEWAL_PRICING, type SalesMoneySubscriptionView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { details } from '../student/fixtures';
import { subscription } from '../testing/fixtures';
import { SalesSubscriptionsScreen } from './SalesSubscriptionsScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (mockPath: string) => mockApiFetch(mockPath) }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (mockHref: unknown) => mockPush(mockHref), back: jest.fn() } }));

const PHONE = '+201001112223';
const FAMILY = `/sales/money/family?phone=${encodeURIComponent(PHONE)}`;
const unpaid = subscription({ id: 'p1', status: 'unpaid', student: { id: 'st1', code: 'AB-0183', name: 'يوسف أحمد' } });
const kid = { id: 'st1', code: 'AB-0183', name: 'يوسف أحمد', status: 'trial', renew_due: false, renewal: DEFAULT_RENEWAL_PRICING };

function serve(open: Pick<SalesMoneySubscriptionView, 'id'>[]) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/auth/me') return { permissions: ['self.sales', 'self.sales_money'] };
    if (path === '/sales/students/st1') return details();
    if (path === FAMILY) return { students: [{ ...kid, open }] };
    return path.endsWith('kind=confirmed') ? [] : [unpaid];
  });
}

const render = () =>
  renderWithQuery(<TreeBaseProvider value="/sales"><SalesSubscriptionsScreen /></TreeBaseProvider>, createTestQueryClient({ meFromApi: true }));

beforeEach(() => {
  mockApiFetch.mockReset();
  mockPush.mockReset();
});

test('a pending row with its package owed: «تسجيل تحويل» on that package (the phone from the student details)', async () => {
  serve([{ id: 'other' }, { id: 'p1' }]);
  await render();
  await fireEvent.press(await screen.findByRole('button', { name: t.sales.money.transferFor.replace('{name}', 'يوسف أحمد') }));
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/students/st1');
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/sales/inbox/sales-transfer', params: { phone: PHONE, subscriptionId: 'p1' } });
});

test('a pending row with nothing owed or due: no action on the row', async () => {
  serve([]);
  await render();
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(FAMILY));
  expect(screen.queryByText(t.sales.money.transfer)).toBeNull();
  expect(screen.queryByText(t.sales.money.renew)).toBeNull();
});
