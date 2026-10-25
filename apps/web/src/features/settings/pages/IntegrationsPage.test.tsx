import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/testing/test-utils';
import { integrationItems } from '@/features/integrations/integrations.fixture';
import { t } from '@/lib/i18n/i18n';
import { IntegrationsPage } from './IntegrationsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/inbox/testing/test-utils')).MockLink,
}));

const s = t.integrations;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«التكاملات» page', () => {
  it('the integrations form under its title; no Google on this page', async () => {
    routeFetch(apiFetch, [['/settings/integrations', integrationItems()]]);
    renderWithClient(<IntegrationsPage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(s.title);
    expect(await screen.findByRole('button', { name: s.saveValues })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: t.googleSync.title })).toBeNull();
  });

  it('only the services that are not messaging; WhatsApp, Kapso and the guards are on «التواصل» › «الحماية»', async () => {
    routeFetch(apiFetch, [['/settings/integrations', integrationItems()]]);
    renderWithClient(<IntegrationsPage />);
    await screen.findByRole('button', { name: s.saveValues });
    for (const g of ['livekit', 'expo', 'web_push', 'fx', 'google'] as const) expect(screen.getByRole('group', { name: s.groups[g] })).toBeTruthy();
    for (const g of ['wa_notifications', 'wa_chat', 'kapso', 'wa_safety'] as const) expect(screen.queryByRole('group', { name: s.groups[g] })).toBeNull();
    expect(screen.getByText(t.communicationsHub.movedToComms)).toBeTruthy();
    const link = screen.getByRole('link', { name: t.communicationsHub.movedToCommsLink });
    expect(link.getAttribute('href')).toBe('/admin/settings/communications?tab=safety');
  });

  it('the title shows once: the panel’s same-named h2 only names its region (visually hidden)', () => {
    routeFetch(apiFetch, [['/settings/integrations', integrationItems()]]);
    renderWithClient(<IntegrationsPage />);
    const h2 = screen.getByRole('heading', { level: 2, name: s.title });
    expect(h2.parentElement?.parentElement?.className).toContain('[&>section>h2]:sr-only');
    expect(h2.closest('section')?.getAttribute('aria-labelledby')).toBe(h2.id);
  });

  it('a save says so in the one toast', async () => {
    routeFetch(apiFetch, [['/settings/integrations', integrationItems()]]);
    renderWithClient(<IntegrationsPage />);
    await screen.findByRole('button', { name: s.saveValues });
    expect(screen.queryAllByRole('status')).toHaveLength(0);
    apiSend.mockResolvedValue(integrationItems());
    fireEvent.change(screen.getByLabelText(s.keys.FX_API_URL.label), { target: { value: 'https://fx.example/latest' } });
    fireEvent.click(screen.getByRole('button', { name: s.saveValues }));
    await waitFor(() => expect(screen.getAllByRole('status')).toHaveLength(1));
  });
});
