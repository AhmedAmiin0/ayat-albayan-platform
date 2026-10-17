import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n';
import { integrationItems } from './integrations.fixture';
import { IntegrationsPanel } from './IntegrationsPanel';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

// docs/19: each line's driver is a select (meta | kapso), never free text; the Kapso keys have a group.

const s = t.integrations;
const ready = () => screen.findByRole('button', { name: s.saveValues });
const select = (label: string) => screen.getByLabelText(label) as HTMLSelectElement;

function renderPanel() {
  routeFetch(apiFetch, [['/settings/integrations', integrationItems()]]);
  renderWithClient(<IntegrationsPanel query="" onSaved={vi.fn()} />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«التكاملات»: the WhatsApp provider select', () => {
  it('renders a select per line with the default first, then «Meta مباشرة» and «Kapso»', async () => {
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
});
