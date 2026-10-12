import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { integrationItems } from './integrations.fixture';
import { IntegrationsPanel } from './IntegrationsPanel';

vi.mock('@/lib/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

describe('«التكاملات», English', () => {
  it('title, groups, labels and states read in English', async () => {
    routeFetch(apiFetch, [['/settings/integrations', integrationItems()]]);
    renderWithClient(<IntegrationsPanel query="" onSaved={vi.fn()} />);
    expect(await screen.findByRole('group', { name: 'WhatsApp chat line' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Integrations' })).toBeTruthy();
    expect(screen.getByLabelText('Exchange rate provider URL')).toBeTruthy();
    expect(screen.getByText('Set on the server')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save integrations' })).toBeTruthy();
    expect(screen.getAllByText('Not set').length).toBeGreaterThan(0);
  });
});
