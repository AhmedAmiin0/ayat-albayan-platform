import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { thread } from '@/inbox/thread-fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { familyOf, familyThread, KID, kid, openSub, PHONE } from './fixtures';
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
  await renderWithQuery(<SalesChatMoney thread={familyThread} />);
  await fireEvent.press(await screen.findByRole('button', { name: m.newSubscription }));
  expect(mockApiFetch).toHaveBeenCalledWith(FAMILY_PATH);
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/inbox/sales-subscribe', params: { phone: PHONE, tz: 'Asia/Riyadh' } });
  await fireEvent.press(screen.getByRole('button', { name: m.recordTransfer }));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/inbox/sales-transfer', params: { phone: PHONE } });
});

test('nothing owed: only «اشتراك جديد»', async () => {
  serve(familyOf(kid()));
  await renderWithQuery(<SalesChatMoney thread={familyThread} />);
  expect(await screen.findByRole('button', { name: m.newSubscription })).toBeTruthy();
  expect(screen.queryByRole('button', { name: m.recordTransfer })).toBeNull();
});

test.each(['pending_renewal', 'expired'] as const)('her %s student: «جدّد الاشتراك» opens the chat subscribe flow on that child', async (status) => {
  serve(familyOf(kid({ status })));
  await renderWithQuery(<SalesChatMoney thread={familyThread} />);
  await fireEvent.press(await screen.findByRole('button', { name: t.students.renew }));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/inbox/sales-subscribe', params: { phone: PHONE, studentId: KID, tz: 'Asia/Riyadh' } });
});

test.each(['new', 'trial', 'pending_subscription', 'active', 'paused', 'churned'] as const)('her %s student: no «جدّد الاشتراك»', async (status) => {
  serve(familyOf(kid({ status })));
  await renderWithQuery(<SalesChatMoney thread={familyThread} />);
  expect(await screen.findByRole('button', { name: m.newSubscription })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.students.renew })).toBeNull();
});

test('no student of hers in the family: no button', async () => {
  serve(familyOf());
  await renderWithQuery(<SalesChatMoney thread={familyThread} />);
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(FAMILY_PATH));
  expect(screen.queryByRole('button')).toBeNull();
});

test('a lead’s chat asks nothing and shows nothing', async () => {
  serve(familyOf(kid()));
  await renderWithQuery(<SalesChatMoney thread={thread} />);
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/auth/me'));
  expect(mockApiFetch).not.toHaveBeenCalledWith(expect.stringContaining('/sales/money'));
  expect(screen.queryByRole('button')).toBeNull();
});

test('without self.sales_money the family is never asked', async () => {
  serve(familyOf(kid()), ['self.sales']);
  await renderWithQuery(<SalesChatMoney thread={familyThread} />);
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/auth/me'));
  expect(mockApiFetch).not.toHaveBeenCalledWith(FAMILY_PATH);
  expect(screen.queryByRole('button')).toBeNull();
});
