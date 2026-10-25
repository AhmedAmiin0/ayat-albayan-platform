import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { SAFETY_GROUPS } from './integration-places';
import { integrationItems } from './integrations.fixture';
import { IntegrationsPanel } from './IntegrationsPanel';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const s = t.integrations;

function renderSafety(query = '') {
  routeFetch(apiFetch, [['/settings/integrations', integrationItems()]]);
  renderWithClient(<IntegrationsPanel query={query} onSaved={vi.fn()} groups={SAFETY_GROUPS} title="الحماية" intro="مقدمة" />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

// docs/23 phase 6: one panel per place, each with its share of the groups (integration-places.ts).
describe('«التكاملات» panel limited to some groups', () => {
  it('shows only those groups, under the given heading and intro', async () => {
    renderSafety();
    await screen.findByRole('button', { name: s.saveValues });
    expect(screen.getByRole('heading', { name: 'الحماية' })).toBeTruthy();
    expect(screen.getByText('مقدمة')).toBeTruthy();
    expect(screen.getByRole('group', { name: s.groups.wa_safety })).toBeTruthy();
    expect(screen.getByRole('group', { name: s.groups.kapso })).toBeTruthy();
    expect(screen.queryByRole('group', { name: s.groups.wa_notifications })).toBeNull();
    expect(screen.queryByRole('group', { name: s.groups.livekit })).toBeNull();
    expect(screen.queryByLabelText(s.keys.WA_WABA_ID.label)).toBeNull();
  });

  it('drafts and saves only its own keys', async () => {
    renderSafety();
    await screen.findByRole('button', { name: s.saveValues });
    fireEvent.change(screen.getByLabelText(s.keys.KAPSO_API_BASE.label), { target: { value: 'https://kapso.example' } });
    apiSend.mockResolvedValue(integrationItems());
    fireEvent.click(screen.getByRole('button', { name: s.saveValues }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PUT', '/settings/integrations', { values: { KAPSO_API_BASE: 'https://kapso.example' } }),
    );
  });

  it('a search that matches none of its groups hides it', () => {
    renderSafety(s.keys.FX_API_URL.label);
    expect(screen.queryByRole('heading', { name: 'الحماية' })).toBeNull();
  });
});
