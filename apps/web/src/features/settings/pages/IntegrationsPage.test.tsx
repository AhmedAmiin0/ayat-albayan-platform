import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { integrationItems } from '@/features/integrations/integrations.fixture';
import { t } from '@/lib/i18n';
import { IntegrationsPage } from './IntegrationsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/inbox/test-utils')).MockLink,
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

  it('a save says so in the one toast', async () => {
    routeFetch(apiFetch, [['/settings/integrations', integrationItems()]]);
    renderWithClient(<IntegrationsPage />);
    await screen.findByRole('button', { name: s.saveValues });
    expect(screen.queryAllByRole('status')).toHaveLength(0);
    apiSend.mockResolvedValue(integrationItems());
    fireEvent.change(screen.getByLabelText(s.keys.WA_ALLOWED_RECIPIENTS.label), { target: { value: '+966551234567' } });
    fireEvent.click(screen.getByRole('button', { name: s.saveValues }));
    await waitFor(() => expect(screen.getAllByRole('status')).toHaveLength(1));
  });
});
