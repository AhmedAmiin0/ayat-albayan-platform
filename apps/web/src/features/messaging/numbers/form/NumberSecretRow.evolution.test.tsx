import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { evolutionPart, evolutionView, NUMBERS } from '@/features/messaging/numbers/numbers.fixture';
import { renderPanel } from '@/features/messaging/numbers/numbers-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/people/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: [], can: () => true }),
}));

const f = t.numbers.fields;

afterEach(() => apiFetch.mockReset());

describe('a number’s secret rows follow its driver', () => {
  it('Evolution Baileys: the instance token and the proxy password, no Cloud token', async () => {
    renderPanel(apiFetch, { numbers: [evolutionView()] });
    const card = await screen.findByRole('article', { name: 'Staff chat line' });
    expect(within(card).getByLabelText(f.evolution_token)).toBeTruthy();
    expect(within(card).getByLabelText(f.evolution_proxy_password)).toBeTruthy();
    expect(within(card).queryByLabelText(f.evolution_cloud_token)).toBeNull();
    expect(within(card).queryByLabelText(f.access_token)).toBeNull();
    expect(within(card).queryByLabelText(f.app_secret)).toBeNull();
  });

  it('a saved instance token warns that replacing it cuts the instance', async () => {
    renderPanel(apiFetch, { numbers: [evolutionView()] });
    const card = await screen.findByRole('article', { name: 'Staff chat line' });
    expect(within(card).getByText(t.numbers.secret.evolutionTokenWarning)).toBeTruthy();
  });

  it('Evolution Cloud: the Cloud access token too', async () => {
    const evolution = evolutionPart({ mode: 'cloud' });
    renderPanel(apiFetch, { numbers: [evolutionView({ evolution })] });
    const card = await screen.findByRole('article', { name: 'Staff chat line' });
    expect(within(card).getByLabelText(f.evolution_cloud_token)).toBeTruthy();
  });

  it('Cloud mode: the warning follows the key in use (the saved Cloud token)', async () => {
    const evolution = evolutionPart({ mode: 'cloud' });
    const base = evolutionView({ evolution });
    const secrets = { ...base.secrets, evolution_cloud_token: { set: true, updated_at: null } };
    renderPanel(apiFetch, { numbers: [{ ...base, secrets }] });
    const card = await screen.findByRole('article', { name: 'Staff chat line' });
    expect(within(card).getAllByText(t.numbers.secret.evolutionTokenWarning)).toHaveLength(1);
    const row = within(card).getByLabelText(f.evolution_cloud_token).closest('div[class*="grid"]');
    expect(row?.textContent).toContain(t.numbers.secret.evolutionTokenWarning);
  });

  it('Meta and Kapso: the access token and app secret, never the instance token', async () => {
    renderPanel(apiFetch, { numbers: NUMBERS });
    for (const name of ['Notifications line', 'Spare line']) {
      const card = await screen.findByRole('article', { name });
      expect(within(card).getByLabelText(f.access_token)).toBeTruthy();
      expect(within(card).getByLabelText(f.app_secret)).toBeTruthy();
      expect(within(card).queryByLabelText(f.evolution_token)).toBeNull();
    }
  });
});
