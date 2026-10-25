import { INTEGRATION_KEYS } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n/i18n';
import { integrationItems } from './integrations.fixture';
import { IntegrationsPanel } from './IntegrationsPanel';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const s = t.integrations;
const ALLOW = s.keys.WA_ALLOWED_RECIPIENTS.label;

function renderPanel() {
  const items = integrationItems().map((i) =>
    i.key === 'WA_ALLOWED_RECIPIENTS' ? { ...i, value: '+201001234567', source: 'db' as const, set: true } : i,
  );
  routeFetch(apiFetch, [['/settings/integrations', items]]);
  renderWithClient(<IntegrationsPanel query="" onSaved={vi.fn()} />);
  return screen.findByRole('button', { name: s.saveValues });
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«التكاملات» speaks Arabic (docs/23a §E H3)', () => {
  it('no field shows a server key name; each one sits folded under «للمطوّر»', async () => {
    await renderPanel();
    for (const input of screen.getAllByRole('textbox')) expect(input.getAttribute('placeholder') ?? '').not.toMatch(/^[A-Z][A-Z0-9_]+$/);
    expect(screen.getAllByText(s.developer)).toHaveLength(INTEGRATION_KEYS.length);
    const details = screen.getAllByText(s.developer)[0]?.closest('details');
    expect(details?.open).toBe(false);
  });

  it('the template sync is a switch with Arabic options, not a word to type', async () => {
    await renderPanel();
    const select = screen.getByLabelText(s.keys.WA_TEMPLATE_SYNC.label) as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect([...select.options].map((o) => o.textContent)).toContain(s.options.false);
    expect(s.keys.WA_TEMPLATE_SYNC.hint).not.toMatch(/false/);
  });
});

describe('emptying the allow-list asks first (docs/23a §E H5)', () => {
  it('cancel keeps the list; confirming saves it as null', async () => {
    await renderPanel();
    fireEvent.change(screen.getByLabelText(ALLOW), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: s.saveValues }));
    const dialog = screen.getByRole('dialog', { name: s.allowListEmptyTitle });
    expect(within(dialog).getByText(s.allowListEmptyConfirm)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: t.common.cancel }));
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue(integrationItems());
    fireEvent.click(screen.getByRole('button', { name: s.saveValues }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: s.allowListEmptyYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    expect(JSON.stringify(apiSend.mock.calls[0])).toContain('"WA_ALLOWED_RECIPIENTS":null');
  });

  it('changing the list to other numbers saves without a question', async () => {
    await renderPanel();
    apiSend.mockResolvedValue(integrationItems());
    fireEvent.change(screen.getByLabelText(ALLOW), { target: { value: '+966551234567' } });
    fireEvent.click(screen.getByRole('button', { name: s.saveValues }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
