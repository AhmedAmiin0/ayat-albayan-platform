import { studentProfileFixture } from '@ab/shared/testing';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ApiError, t, money } from '@ab/mobile-kit';
import { payment } from '@/payments/fixtures';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { StudentMoneyScreen } from './StudentMoneyScreen';
import { mockCall } from '@ab/testing/mock-call';

const M = t.mobileStudentFile.money;
const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

const invoice = {
  id: 'i1',
  created_at: '2026-10-01T10:00:00Z',
  kind: 'package',
  source: 'upload',
  students: [],
  payment_id: null,
};
let permissions = ['payments.read', 'invoices.read'];
function serve(invoices: unknown[] = [invoice]) {
  mockApi.onRead(async ({ path }) => {
    if (path === '/auth/me') return { permissions };
    if (path === '/students/s1') return studentProfileFixture({ id: 's1', name: 'هدى' });
    if (path.startsWith('/payments?')) {
      return {
        items: [payment()],
        total: 1,
        page: 1,
        pageSize: 25,
        totals: [{ currency: 'SAR', net: 145, payments: 145, refunds: 0 }],
      };
    }
    if (path === '/invoices?studentId=s1') return invoices;
    if (path === '/invoices/i1/download') return { url: 'https://files.test/inv.pdf?t=1' };
    throw new ApiError(404);
  });
}

let openURL: jest.SpyInstance;
beforeEach(() => {
  permissions = ['payments.read', 'invoices.read'];
  mockApi.reset('read');
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});
afterEach(() => openURL.mockRestore());

test('payments of the student with the net, from GET /payments?studentId=', async () => {
  serve();
  await renderWithQuery(<StudentMoneyScreen />, createTestQueryClient({ meFromApi: true }));
  expect((await screen.findAllByText(money(145, 'SAR'))).length).toBe(2);
  expect(mockApi.reads()).toContainEqual({
    method: 'GET',
    path: '/payments?studentId=s1&page=1&pageSize=25',
  });
  expect(screen.getByRole('header', { name: M.title })).toBeTruthy();
});

test('the invoices tab lists them and opens a fresh signed link in the system viewer', async () => {
  serve();
  await renderWithQuery(<StudentMoneyScreen />, createTestQueryClient({ meFromApi: true }));
  await fireEvent.press(await screen.findByRole('tab', { name: M.tabInvoices }));
  await fireEvent.press(await screen.findByText(M.viewInvoice));
  await waitFor(() => expect(openURL).toHaveBeenCalledWith('https://files.test/inv.pdf?t=1'));
});

test('empty and failed states; a missing permission hides its tab', async () => {
  serve([]);
  permissions = ['invoices.read'];
  const view = await renderWithQuery(
    <StudentMoneyScreen />,
    createTestQueryClient({ meFromApi: true }),
  );
  expect(await screen.findByText(M.invoicesEmpty)).toBeTruthy();
  expect(screen.queryByRole('tab', { name: M.tabPayments })).toBeNull();
  view.unmount();
  // D6: /auth/me answers (a failed one hides every tab); the lists fail.
  mockApi.reset('read');
  mockApi.onRead(async ({ path }) => {
    if (path === '/auth/me') return { permissions: ['payments.read', 'invoices.read'] };
    throw new ApiError(500);
  });
  await renderWithQuery(<StudentMoneyScreen />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByText(M.error, undefined, { timeout: 3000 })).toBeTruthy();
});
