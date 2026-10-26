import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { thread } from '@/inbox/shared/thread-fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { familyOf, familyThread, KID, KID2, kid, openSub, PHONE } from '../testing/fixtures';
import { SalesChatMoney } from './SalesChatMoney';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (h: unknown) => mockPush(h) } }));

const m = t.salesMoney;
const FAMILY_PATH = `/sales/money/family?phone=${encodeURIComponent(PHONE)}`;

function serve(family: unknown, permissions = ['self.sales', 'self.sales_money']) {
  mockApiFetch.mockImplementation(async (path: string) => (path === '/auth/me' ? { permissions } : family));
}

beforeEach(() => jest.clearAllMocks());

test('her student with an owed package: «اشتراك جديد» and «سجّل تحويلًا بنكيًا», each opening its screen', async () => {
  serve(familyOf(kid({ open: [openSub()] })));
  await renderWithQuery(<SalesChatMoney thread={familyThread} />, createTestQueryClient({ meFromApi: true }));
  await fireEvent.press(await screen.findByRole('button', { name: m.newSubscription }));
  expect(mockApiFetch).toHaveBeenCalledWith(FAMILY_PATH);
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/inbox/sales-subscribe', params: { phone: PHONE, tz: 'Asia/Riyadh' } });
  await fireEvent.press(screen.getByRole('button', { name: m.recordTransfer }));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/inbox/sales-transfer', params: { phone: PHONE } });
});

test('nothing owed: only «اشتراك جديد»', async () => {
  serve(familyOf(kid()));
  await renderWithQuery(<SalesChatMoney thread={familyThread} />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByRole('button', { name: m.newSubscription })).toBeTruthy();
  expect(screen.queryByRole('button', { name: m.recordTransfer })).toBeNull();
});

test.each(['pending_renewal', 'expired', 'active'] as const)('her %s student due: «جدّد الاشتراك» opens the renewal on that child', async (status) => {
  serve(familyOf(kid({ status, renew_due: true })));
  await renderWithQuery(<SalesChatMoney thread={familyThread} />, createTestQueryClient({ meFromApi: true }));
  await fireEvent.press(await screen.findByRole('button', { name: t.students.renew }));
  expect(mockPush).toHaveBeenLastCalledWith({
    pathname: '/inbox/sales-subscribe',
    params: { phone: PHONE, studentId: KID, renew: '1', tz: 'Asia/Riyadh' },
  });
});

test('the renew pills come first, one per due child, then «اشتراك جديد» and the transfer', async () => {
  serve(familyOf(kid({ status: 'expired', renew_due: true, open: [openSub()] }), kid({ id: KID2, name: 'سلمى', renew_due: true }), kid({ id: 'k3', name: 'هند' })));
  await renderWithQuery(<SalesChatMoney thread={familyThread} />, createTestQueryClient({ meFromApi: true }));
  await screen.findByRole('button', { name: m.newSubscription });
  expect(screen.getAllByRole('button').map((b) => within(b).getByText(/.+/).props.children)).toEqual([
    `${t.students.renew} — ريم`,
    `${t.students.renew} — سلمى`,
    m.newSubscription,
    m.recordTransfer,
  ]);
});

test.each(['new', 'trial', 'pending_subscription', 'active', 'paused', 'churned', 'expired'] as const)('her %s student, not due: no «جدّد الاشتراك»', async (status) => {
  serve(familyOf(kid({ status })));
  await renderWithQuery(<SalesChatMoney thread={familyThread} />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByRole('button', { name: m.newSubscription })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.students.renew })).toBeNull();
});

test('no student of hers in the family: no button', async () => {
  serve(familyOf());
  await renderWithQuery(<SalesChatMoney thread={familyThread} />, createTestQueryClient({ meFromApi: true }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(FAMILY_PATH));
  expect(screen.queryByRole('button')).toBeNull();
});

test('a lead’s chat asks nothing and shows nothing', async () => {
  serve(familyOf(kid()));
  await renderWithQuery(<SalesChatMoney thread={thread} />, createTestQueryClient({ meFromApi: true }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/auth/me'));
  expect(mockApiFetch).not.toHaveBeenCalledWith(expect.stringContaining('/sales/money'));
  expect(screen.queryByRole('button')).toBeNull();
});

test('without self.sales_money the family is never asked', async () => {
  serve(familyOf(kid()), ['self.sales']);
  await renderWithQuery(<SalesChatMoney thread={familyThread} />, createTestQueryClient({ meFromApi: true }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/auth/me'));
  expect(mockApiFetch).not.toHaveBeenCalledWith(FAMILY_PATH);
  expect(screen.queryByRole('button')).toBeNull();
});
