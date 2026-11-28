import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError, t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { paymentLink } from '@/sales-subscribe/testing/link-fixtures';
import { PaymentLinksScreen } from './PaymentLinksScreen';
import { mockCall } from '@ab/testing/mock-call';

jest.mock('@/sales-subscribe/payment-link/flag', () => ({ STRIPE_FEATURE: true }));
const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const pl = t.paymentLinks;
const LINKS = [
  paymentLink(),
  paymentLink({
    id: 'l-2',
    status: 'paid',
    paid_at: '2026-10-20T09:00:00.000Z',
    student: { id: 's2', code: 'AB-0202', name: 'سلمى' },
  }),
  paymentLink({
    id: 'l-3',
    expires_at: '2026-10-01T09:00:00.000Z',
    student: { id: 's3', code: 'AB-0203', name: 'يوسف' },
  }),
];

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.onRead(async ({ path }) => (path === '/stripe/feature' ? { stripe: true } : LINKS));
  mockApi.onWrite(() => paymentLink({ status: 'cancelled' }));
});

test('her links: student, status chip (an open link past expiry reads expired), cancel only on the open one', async () => {
  await renderWithQuery(<PaymentLinksScreen />);
  expect(await screen.findByText('ريم')).toBeTruthy();
  expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/sales/payment-links' });
  expect(screen.getByText(pl.status.open)).toBeTruthy();
  expect(screen.getByText(pl.status.paid)).toBeTruthy();
  expect(screen.getByText(pl.status.expired)).toBeTruthy();
  expect(screen.getAllByRole('button', { name: new RegExp(pl.cancel) })).toHaveLength(1);
});

test('«إلغاء الرابط» asks first, then POSTs the cancel', async () => {
  await renderWithQuery(<PaymentLinksScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: `${pl.cancel} — ريم` }));
  expect(screen.getByText(pl.cancelConfirm)).toBeTruthy();
  expect(mockApi.writes()).toHaveLength(0);
  await fireEvent.press(screen.getByRole('button', { name: pl.cancel }));
  await waitFor(() =>
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: '/sales/payment-links/l-1/cancel',
      body: undefined,
    }),
  );
});

test('a link no longer open: the 409 in her words', async () => {
  mockApi.onWrite(() => Promise.reject(new ApiError(409, { code: 'link_not_open' })));
  await renderWithQuery(<PaymentLinksScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: `${pl.cancel} — ريم` }));
  await fireEvent.press(screen.getByRole('button', { name: pl.cancel }));
  expect(await screen.findByText(pl.error.link_not_open)).toBeTruthy();
});

test('no links: the empty state', async () => {
  mockApi.onRead(async ({ path }) => (path === '/stripe/feature' ? { stripe: true } : []));
  await renderWithQuery(<PaymentLinksScreen />);
  expect(await screen.findByText(pl.empty)).toBeTruthy();
  expect(screen.queryByText(pl.status.open)).toBeNull();
});
