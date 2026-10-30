import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { paymentLink } from '../../testing/link-fixtures';
import { PaymentLinksScreen } from './PaymentLinksScreen';

jest.mock('../flag', () => ({ STRIPE_FEATURE: true }));
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const pl = t.paymentLinks;
const LINKS = [
  paymentLink(),
  paymentLink({ id: 'l-2', status: 'paid', paid_at: '2026-10-20T09:00:00.000Z', student: { id: 's2', code: 'AB-0202', name: 'سلمى' } }),
  paymentLink({ id: 'l-3', expires_at: '2026-10-01T09:00:00.000Z', student: { id: 's3', code: 'AB-0203', name: 'يوسف' } }),
];

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (path: string) => (path === '/stripe/feature' ? { stripe: true } : LINKS));
  mockApiSend.mockResolvedValue(paymentLink({ status: 'cancelled' }));
});

test('her links: student, status chip (an open link past expiry reads expired), cancel only on the open one', async () => {
  await renderWithQuery(<PaymentLinksScreen />);
  expect(await screen.findByText('ريم')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/sales/payment-links');
  expect(screen.getByText(pl.status.open)).toBeTruthy();
  expect(screen.getByText(pl.status.paid)).toBeTruthy();
  expect(screen.getByText(pl.status.expired)).toBeTruthy();
  expect(screen.getAllByRole('button', { name: new RegExp(pl.cancel) })).toHaveLength(1);
});

test('«إلغاء الرابط» asks first, then POSTs the cancel', async () => {
  await renderWithQuery(<PaymentLinksScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: `${pl.cancel} — ريم` }));
  expect(screen.getByText(pl.cancelConfirm)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: pl.cancel }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/payment-links/l-1/cancel'));
});

test('a link no longer open: the 409 in her words', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'link_not_open' }));
  await renderWithQuery(<PaymentLinksScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: `${pl.cancel} — ريم` }));
  await fireEvent.press(screen.getByRole('button', { name: pl.cancel }));
  expect(await screen.findByText(pl.error.link_not_open)).toBeTruthy();
});

test('no links: the empty state', async () => {
  mockApiFetch.mockImplementation(async (path: string) => (path === '/stripe/feature' ? { stripe: true } : []));
  await renderWithQuery(<PaymentLinksScreen />);
  expect(await screen.findByText(pl.empty)).toBeTruthy();
  expect(screen.queryByText(pl.status.open)).toBeNull();
});
