import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { stripeFeatureQuery } from '@/features/sales/payment-links';
import { t } from '@/lib/i18n/i18n';
import { integrationItems } from './integrations.fixture';
import { IntegrationsPanel } from './IntegrationsPanel';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

// «الدفع الإلكتروني» (docs/30): the form refuses a live or malformed Stripe key before anything
// leaves, as the API does (integrationSecretCheck), and a save asks GET /stripe/feature again.
const s = t.integrations;
const FEATURE = { queryKey: stripeFeatureQuery.queryKey };

async function renderPanel() {
  routeFetch(apiFetch, [['/settings/integrations', integrationItems()]]);
  const client = renderWithClient(<IntegrationsPanel query="" onSaved={vi.fn()} />);
  await screen.findByRole('button', { name: s.saveValues });
  return vi.spyOn(client, 'invalidateQueries');
}

/** Types into a secret's field: its row (for the error) and its «حفظ القيمة». */
function typeSecret(key: 'STRIPE_API_KEY' | 'STRIPE_WEBHOOK_SECRET', value: string) {
  const input = screen.getByLabelText(s.keys[key].label);
  fireEvent.change(input, { target: { value } });
  const row = input.closest<HTMLElement>('div.grid');
  if (!row) throw new Error(`no row for ${key}`);
  return { row, save: within(row).getByRole('button', { name: s.saveSecret }) };
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«التكاملات» › Stripe', () => {
  it.each([
    ['STRIPE_API_KEY', 'rk_live_51Abc'],
    ['STRIPE_WEBHOOK_SECRET', 'abc123'],
  ] as const)('%s «%s» is refused before anything leaves', async (key, value) => {
    await renderPanel();
    const { row, save } = typeSecret(key, value);
    expect(within(row).getByText(s.invalid)).toBeTruthy();
    expect(save).toHaveProperty('disabled', true);
    fireEvent.click(save);
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('a sandbox key is sent trimmed, and the payment buttons are asked again', async () => {
    const spy = await renderPanel();
    apiSend.mockResolvedValue(integrationItems());
    const { row, save } = typeSecret('STRIPE_API_KEY', ' rk_test_51Abc ');
    expect(within(row).queryByText(s.invalid)).toBeNull();
    fireEvent.click(save);
    const url = '/settings/integrations/secrets/STRIPE_API_KEY';
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', url, { value: 'rk_test_51Abc' }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith(FEATURE));
  });

  it('the switch saves STRIPE_ENABLED, and the payment buttons are asked again', async () => {
    const spy = await renderPanel();
    apiSend.mockResolvedValue(integrationItems());
    const toggle = screen.getByLabelText(s.keys.STRIPE_ENABLED.label);
    fireEvent.change(toggle, { target: { value: 'true' } });
    fireEvent.click(screen.getByRole('button', { name: s.saveValues }));
    const body = { values: { STRIPE_ENABLED: 'true' } };
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/settings/integrations', body));
    await waitFor(() => expect(spy).toHaveBeenCalledWith(FEATURE));
  });
});
