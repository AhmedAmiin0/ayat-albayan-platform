import type { IntegrationConfigItem } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { seedFullAccess } from '@/test/staff-me';
import { StripeSwitchRow } from './StripeSwitchRow';

// The owner's hard rule (docs/30): «الدفع الإلكتروني» exists only in the Stripe test app.
const mockFlag = { on: false };
jest.mock('@/sales-subscribe/payment-link/flag', () => ({
  get STRIPE_FEATURE() {
    return mockFlag.on;
  },
}));
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b: unknown) => mockApiSend(m, p, b),
}));

const S = t.paymentLinks.settings;
const item = (key: IntegrationConfigItem['key'], over: Partial<IntegrationConfigItem> = {}): IntegrationConfigItem => ({
  key, group: 'stripe', secret: false, value: null, set: false, source: 'unset', updated_at: null, ...over,
});
const ITEMS = [item('STRIPE_ENABLED'), item('STRIPE_API_KEY', { secret: true, set: true }), item('STRIPE_WEBHOOK_SECRET', { secret: true })];
const as = (role: 'admin' | 'sales') => {
  const client = createTestQueryClient({ meFromApi: true });
  seedFullAccess(client, role);
  return client;
};
const integrationCalls = () => mockApiFetch.mock.calls.filter(([p]) => p === '/settings/integrations');

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue(ITEMS);
  mockApiSend.mockResolvedValue(ITEMS.map((i) => (i.key === 'STRIPE_ENABLED' ? { ...i, value: 'true', set: true } : i)));
});

test('a normal build (flag false): nothing, and nothing asked, even for an admin', async () => {
  mockFlag.on = false;
  const row = await renderWithQuery(<StripeSwitchRow />, as('admin'));
  expect(row.toJSON()).toBeNull();
  expect(integrationCalls()).toEqual([]);
});

test('the test app, not an admin: nothing, and the integrations are never asked', async () => {
  mockFlag.on = true;
  const row = await renderWithQuery(<StripeSwitchRow />, as('sales'));
  expect(row.toJSON()).toBeNull();
  expect(integrationCalls()).toEqual([]);
});

test('a server without Stripe (no Stripe key listed): nothing', async () => {
  mockFlag.on = true;
  mockApiFetch.mockResolvedValue([item('FX_API_URL')]);
  const row = await renderWithQuery(<StripeSwitchRow />, as('admin'));
  await waitFor(() => expect(integrationCalls()).toHaveLength(1));
  expect(row.toJSON()).toBeNull();
});

test('the test app, an admin: the switch (off by default) saves STRIPE_ENABLED and says what is missing', async () => {
  mockFlag.on = true;
  const client = as('admin');
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  await renderWithQuery(<StripeSwitchRow />, client);
  const toggle = await screen.findByLabelText(S.enabled);
  expect(screen.getByText(S.hint)).toBeTruthy();
  await fireEvent(toggle, 'valueChange', true);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PUT', '/settings/integrations', { values: { STRIPE_ENABLED: 'true' } }));
  // The chat's «دفع إلكتروني» / «رابط دفع» follow the switch at once.
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['stripe', 'feature'] }));
  const missing = new RegExp(t.integrations.keys.STRIPE_WEBHOOK_SECRET.label);
  expect(await screen.findByText(missing)).toBeTruthy();
});
