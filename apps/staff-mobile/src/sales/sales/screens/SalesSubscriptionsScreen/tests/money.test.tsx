import { salesFamilyStudent, salesOwedPackage } from '@ab/shared/testing';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { t } from '@ab/mobile-kit';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { details } from '@/sales/sales/student/fixtures';
import { subscription } from '@/sales/sales/testing/fixtures';
import { SalesSubscriptionsScreen } from '@/sales/sales/screens/SalesSubscriptionsScreen';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({ ...jest.requireActual('@ab/mobile-kit/lib/http/api'), apiFetch: (mockPath: string) => mockApiFetch(mockPath) }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (mockHref: unknown) => mockPush(mockHref), back: jest.fn() } }));

const PHONE = '+201001112223';
const FAMILY = `/sales/money/family?phone=${encodeURIComponent(PHONE)}`;
const unpaid = subscription({ id: 'p1', status: 'unpaid', student: { id: 'st1', code: 'AB-0183', name: 'يوسف أحمد' } });
const REF = { id: 'st1', code: 'AB-0183', name: 'يوسف أحمد' };
const kid = salesFamilyStudent(REF);

function serve(ids: string[]) {
  const open = ids.map((id) => salesOwedPackage({ id, student: REF }));
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
  serve(['other', 'p1']);
  await render();
  await fireEvent.press(await screen.findByRole('button', { name: t.sales.money.transferFor.replace('{name}', 'يوسف أحمد') }));
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/students/st1');
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/sales/inbox/sales-transfer', params: { phone: PHONE, subscriptionId: 'p1' } });
});

test('a pending row with nothing owed or due: no action on the row', async () => {
  serve([]);
  const { client } = await render();
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  // The family has answered (not just been asked): the hidden action is the picker's call.
  await waitFor(() => expect(client.getQueryData(['sales', 'money', 'family', PHONE])).toBeDefined());
  expect(screen.queryByText(t.sales.money.transfer)).toBeNull();
  expect(screen.queryByText(t.sales.money.renew)).toBeNull();
});
