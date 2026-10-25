import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n/i18n';
import { integrationItems } from './integrations.fixture';
import { IntegrationsPanel } from './IntegrationsPanel';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

// docs/19: each line's driver is a select (meta | kapso | crm), never free text; the Kapso and CRM keys have a group.

const s = t.integrations;
const ready = () => screen.findByRole('button', { name: s.saveValues });
const select = (label: string) => screen.getByLabelText(label) as HTMLSelectElement;

function renderPanel(items = integrationItems()) {
  routeFetch(apiFetch, [['/settings/integrations', items]]);
  renderWithClient(<IntegrationsPanel query="" onSaved={vi.fn()} />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«التكاملات»: the WhatsApp provider select', () => {
  it('renders a select per line with the default first, then «Meta مباشرة», «Kapso» and «نظام CRM»', async () => {
    renderPanel();
    await ready();
    for (const key of ['WA_PROVIDER', 'WA_CHAT_PROVIDER'] as const) {
      const field = select(s.keys[key].label);
      expect(field.tagName).toBe('SELECT');
      expect(field.value).toBe('');
      expect([...field.options].map((o) => [o.value, o.text])).toEqual([
        ['', s.enumDefault.replace('{value}', s.options.meta)],
        ['meta', s.options.meta],
        ['kapso', s.options.kapso],
        ['crm', s.options.crm],
      ]);
    }
    expect(screen.getByRole('group', { name: s.groups.kapso })).toBeTruthy();
    expect((screen.getByLabelText(s.keys.KAPSO_API_KEY.label) as HTMLInputElement).type).toBe('password');
  });

  it('switching the notifications line to kapso saves only that key', async () => {
    renderPanel();
    await ready();
    fireEvent.change(select(s.keys.WA_PROVIDER.label), { target: { value: 'kapso' } });
    apiSend.mockResolvedValue(integrationItems());
    fireEvent.click(screen.getByRole('button', { name: s.saveValues }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/settings/integrations', { values: { WA_PROVIDER: 'kapso' } }));
  });

  it('with the server on kapso (source env) the empty choice names the server value, not «Meta»', async () => {
    const items = integrationItems().map((i) => (i.key === 'WA_PROVIDER' ? { ...i, value: 'kapso', set: true, source: 'env' as const } : i));
    renderPanel(items);
    await ready();
    expect(select(s.keys.WA_PROVIDER.label).options[0]?.text).toBe(s.enumServer.replace('{value}', s.options.kapso));
    expect(select(s.keys.WA_CHAT_PROVIDER.label).options[0]?.text).toBe(s.enumDefault.replace('{value}', s.options.meta));
  });

  it('the select shows Arabic labels without the monospace of the LTR text inputs', async () => {
    renderPanel();
    await ready();
    expect(select(s.keys.WA_PROVIDER.label).className).not.toContain('font-mono');
    expect(screen.getByLabelText(s.keys.KAPSO_API_BASE.label).className).toContain('font-mono');
  });

  it('the CRM group: its base as a URL field, its key and webhook secret as secrets, each with a hint', async () => {
    renderPanel();
    await ready();
    expect(screen.getByRole('group', { name: s.groups.wacrm })).toBeTruthy();
    expect((screen.getByLabelText(s.keys.WACRM_API_BASE.label) as HTMLInputElement).type).not.toBe('password');
    for (const key of ['WACRM_API_KEY', 'WACRM_WEBHOOK_SECRET'] as const) {
      expect((screen.getByLabelText(s.keys[key].label) as HTMLInputElement).type).toBe('password');
      expect(screen.getByText(s.keys[key].hint)).toBeTruthy();
    }
    expect(s.keys.WACRM_API_KEY.hint).toContain('messages:send');
    expect(s.keys.WACRM_WEBHOOK_SECRET.hint).toContain('/webhooks/wacrm');
  });
});
