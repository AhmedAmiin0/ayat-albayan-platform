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
/** The form is there once GET /settings/integrations answered. */
const ready = () => screen.findByRole('button', { name: s.saveValues });
const field = (key: keyof typeof s.keys) => screen.getByLabelText(s.keys[key].label) as HTMLInputElement;

function renderPanel(query = '') {
  routeFetch(apiFetch, [['/settings/integrations', integrationItems()]]);
  const onSaved = vi.fn();
  renderWithClient(<IntegrationsPanel query={query} onSaved={onSaved} />);
  return onSaved;
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«التكاملات» panel', () => {
  it('shows every group; plain fields prefilled with their source, secrets never prefilled', async () => {
    renderPanel();
    await ready();
    expect(screen.getByRole('heading', { name: s.title })).toBeTruthy();
    for (const g of Object.values(s.groups)) expect(screen.getByRole('group', { name: g })).toBeTruthy();
    expect(field('WA_WABA_ID').value).toBe('db-waba');
    expect(field('WA_API_BASE').value).toBe('http://localhost:4010');
    expect(screen.getAllByText(s.source.db, { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(s.source.env).length).toBeGreaterThan(0);
    const token = field('WA_ACCESS_TOKEN');
    expect(token.type).toBe('password');
    expect(token.value).toBe('');
    expect(screen.getByText(s.secretFromServer)).toBeTruthy();
    expect(screen.getAllByText(s.secretUnset).length).toBeGreaterThan(0);
    // Google has its own page now («مزامنة Google»): nothing of it here, and no Google request.
    expect(screen.queryByRole('heading', { name: t.googleSync.title })).toBeNull();
    expect(apiFetch.mock.calls.some(([path]) => String(path).startsWith('/admin/google'))).toBe(false);
  });

  it('saves only the changed plain values; an emptied field is null (back to the server value)', async () => {
    const onSaved = renderPanel();
    await ready();
    fireEvent.change(field('WA_WABA_ID'), { target: { value: '' } });
    fireEvent.change(field('WA_API_VERSION'), { target: { value: ' v22.0 ' } });
    apiSend.mockResolvedValue(integrationItems());
    fireEvent.click(screen.getByRole('button', { name: s.saveValues }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PUT', '/settings/integrations', { values: { WA_WABA_ID: null, WA_API_VERSION: 'v22.0' } }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(s.saved));
  });

  it('a bad value is flagged on its field and nothing is sent', async () => {
    renderPanel();
    await ready();
    fireEvent.change(field('LIVEKIT_URL'), { target: { value: 'not a url' } });
    fireEvent.click(screen.getByRole('button', { name: s.saveValues }));
    expect(await screen.findByText(s.invalid)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('a secret is saved on its own row and the field empties', async () => {
    const onSaved = renderPanel();
    await ready();
    fireEvent.change(field('LIVEKIT_API_SECRET'), { target: { value: 'fake-secret' } });
    apiSend.mockResolvedValue(integrationItems());
    const row = field('LIVEKIT_API_SECRET').closest('div.grid') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: s.saveSecret }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PUT', '/settings/integrations/secrets/LIVEKIT_API_SECRET', { value: 'fake-secret' }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(s.secretStored));
    expect(field('LIVEKIT_API_SECRET').value).toBe('');
  });

  it('«مسح» exists only for a secret saved in settings and asks first', async () => {
    renderPanel();
    await ready();
    const clears = screen.getAllByRole('button', { name: s.clearSecret });
    expect(clears).toHaveLength(1);
    fireEvent.click(clears[0] as HTMLElement);
    const dialog = screen.getByRole('dialog', { name: s.clearSecret });
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue(integrationItems());
    fireEvent.click(within(dialog).getByRole('button', { name: s.clearSecret }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('DELETE', '/settings/integrations/secrets/WA_ACCESS_TOKEN'));
  });

  it('the settings search filters the rows; no match hides the section', async () => {
    renderPanel('LIVEKIT');
    expect(await screen.findByRole('group', { name: s.groups.livekit })).toBeTruthy();
    expect(screen.queryByRole('group', { name: s.groups.fx })).toBeNull();
    renderPanel('zzzz-nothing');
    expect(screen.getAllByRole('heading', { name: s.title })).toHaveLength(1);
  });
});
