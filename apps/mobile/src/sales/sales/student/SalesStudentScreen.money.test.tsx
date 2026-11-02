import { DEFAULT_RENEWAL_PRICING, type SalesFamilyStudent, type SalesMoneySubscriptionView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { details } from './fixtures';
import { SalesStudentScreen } from './SalesStudentScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (mockPath: string) => mockApiFetch(mockPath) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ id: 'st1' }) }));

const PHONE = '+201001112223';
const FAMILY = `/sales/money/family?phone=${encodeURIComponent(PHONE)}`;
const m = t.sales.money;
const kid = (over: Partial<SalesFamilyStudent>): SalesFamilyStudent => ({
  id: 'st1', code: 'AB-0183', name: 'يوسف أحمد', status: 'active', open: [], renew_due: false, renewal: DEFAULT_RENEWAL_PRICING, teacher_id: null, ...over,
});

function serve(student: SalesFamilyStudent, permissions = ['self.sales', 'self.sales_money']) {
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/auth/me' ? { permissions } : path === FAMILY ? { students: [student] } : details(),
  );
}

const open = () =>
  renderWithQuery(<TreeBaseProvider value="/sales"><SalesStudentScreen /></TreeBaseProvider>, createTestQueryClient({ meFromApi: true }));

beforeEach(() => {
  mockApiFetch.mockReset();
  jest.mocked(router.push).mockClear();
});

test('an owed package: ONE primary «تسجيل تحويل» opening the transfer screen on that package', async () => {
  serve(kid({ open: [{ id: 'sub2' } as SalesMoneySubscriptionView], renew_due: true }));
  await open();
  await fireEvent.press(await screen.findByRole('button', { name: m.transferFor.replace('{name}', 'يوسف أحمد') }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/sales/inbox/sales-transfer', params: { phone: PHONE, subscriptionId: 'sub2' } });
  expect(screen.queryByRole('button', { name: m.renewFor.replace('{name}', 'يوسف أحمد') })).toBeNull();
});

test('nothing owed, renewal due: «تجديد» opening the subscribe screen with the child and renew', async () => {
  serve(kid({ renew_due: true }));
  await open();
  await fireEvent.press(await screen.findByRole('button', { name: m.renewFor.replace('{name}', 'يوسف أحمد') }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/sales/inbox/sales-subscribe', params: { phone: PHONE, studentId: 'st1', renew: '1' } });
});

test('nothing owed or due: no money action', async () => {
  serve(kid({}));
  const { client } = await open();
  // The family has answered (not just been asked): the hidden action is the picker's call.
  await waitFor(() => expect(client.getQueryData(['sales', 'money', 'family', PHONE])).toBeDefined());
  expect(screen.queryByText(m.transfer)).toBeNull();
  expect(screen.queryByText(m.renew)).toBeNull();
});

test('without self.sales_money the family is never read and nothing shows', async () => {
  serve(kid({ renew_due: true }), ['self.sales']);
  await open();
  expect(await screen.findByRole('header', { name: 'يوسف أحمد' })).toBeTruthy();
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/auth/me'));
  expect(mockApiFetch).not.toHaveBeenCalledWith(FAMILY);
  expect(screen.queryByText(m.renew)).toBeNull();
});

// sales.renew_any (owner 2026-11-01): ANY student, whoever brought it (or nobody); else hers.
function serveOther(permissions: string[]) {
  const other = kid({ renew_due: true, mine: false });
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/auth/me' ? { permissions } : path === FAMILY ? { students: [other] } : details({ mine: false }),
  );
}

test('not hers, with sales.renew_any: «تجديد» opens the subscribe screen for that child', async () => {
  serveOther(['self.sales', 'self.sales_money', 'sales.renew_any']);
  await open();
  await fireEvent.press(await screen.findByRole('button', { name: m.renewFor.replace('{name}', 'يوسف أحمد') }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/sales/inbox/sales-subscribe', params: { phone: PHONE, studentId: 'st1', renew: '1' } });
});

test('not hers, without sales.renew_any: no money action and the family is never read', async () => {
  serveOther(['self.sales', 'self.sales_money']);
  await open();
  expect(await screen.findByRole('header', { name: 'يوسف أحمد' })).toBeTruthy();
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/auth/me'));
  expect(mockApiFetch).not.toHaveBeenCalledWith(FAMILY);
  expect(screen.queryByText(m.renew)).toBeNull();
});
