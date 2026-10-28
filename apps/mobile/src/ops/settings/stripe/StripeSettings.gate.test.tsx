import { screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { seedFullAccess } from '@/test/staff-me';
import { SettingsScreen } from '../SettingsScreen';
import { StripeSettingsRow } from './StripeSettingsRow';
import { StripeSettingsScreen } from './StripeSettingsScreen';
import { SETTINGS } from './stripe-settings.fixture';

// The owner's hard rule (docs/30): «الدفع الإلكتروني (اختبار)» exists only in the Stripe test app.
const mockFlag = { on: false };
jest.mock('@/sales-subscribe/payment-link/flag', () => ({
  get STRIPE_FEATURE() {
    return mockFlag.on;
  },
}));
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() } }));

const S = t.paymentLinks.settings;
const as = (role: 'admin' | 'sales') => {
  const client = createTestQueryClient({ meFromApi: true });
  seedFullAccess(client, role);
  return client;
};
const stripeCalls = () => mockApiFetch.mock.calls.filter(([p]) => String(p).includes('stripe'));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (p: string) => (p === '/admin/stripe/settings' ? SETTINGS : {}));
});

test('a normal build (flag false): no row, no screen, no Stripe request, even for an admin', async () => {
  mockFlag.on = false;
  const row = await renderWithQuery(<StripeSettingsRow />, as('admin'));
  expect(row.toJSON()).toBeNull();
  const page = await renderWithQuery(<StripeSettingsScreen />, as('admin'));
  expect(page.toJSON()).toBeNull();
  await renderWithQuery(<SettingsScreen />, as('admin'));
  expect(screen.queryByText(S.section)).toBeNull();
  expect(stripeCalls()).toEqual([]);
});

test('the test app, an admin: the row in «الإعدادات» and the screen with the form', async () => {
  mockFlag.on = true;
  await renderWithQuery(<SettingsScreen />, as('admin'));
  expect(await screen.findByText(S.section)).toBeTruthy();
  await renderWithQuery(<StripeSettingsScreen />, as('admin'));
  expect(await screen.findByText(S.webhookUrl)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/admin/stripe/settings');
});

test('the test app, not an admin: nothing, and the admin API is never asked', async () => {
  mockFlag.on = true;
  const row = await renderWithQuery(<StripeSettingsRow />, as('sales'));
  expect(row.toJSON()).toBeNull();
  expect(stripeCalls()).toEqual([]);
});

test('the test app on a server without Stripe (404): no row', async () => {
  mockFlag.on = true;
  mockApiFetch.mockRejectedValue(new ApiError(404, { code: 'not_found' }));
  const row = await renderWithQuery(<StripeSettingsRow />, as('admin'));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/admin/stripe/settings'));
  expect(row.toJSON()).toBeNull();
});
