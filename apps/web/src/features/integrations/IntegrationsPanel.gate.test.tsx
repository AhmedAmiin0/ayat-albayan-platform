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
const field = (key: keyof typeof s.keys) => screen.getByLabelText(s.keys[key].label) as HTMLInputElement;
const GATE = { queryKey: ['send-gate'] };

async function renderPanel() {
  const items = integrationItems().map((i) =>
    i.key === 'WA_ALLOWED_RECIPIENTS' ? { ...i, value: '+201001234567', source: 'db' as const, set: true } : i,
  );
  routeFetch(apiFetch, [['/settings/integrations', items]]);
  const client = renderWithClient(<IntegrationsPanel query="" onSaved={vi.fn()} />);
  const spy = vi.spyOn(client, 'invalidateQueries');
  await screen.findByRole('button', { name: s.saveValues });
  return spy;
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('a saved integration refreshes the sending chip (GET /messages/gate)', () => {
  it('plain values: the gate is asked again after the save', async () => {
    const spy = await renderPanel();
    apiSend.mockResolvedValue(integrationItems());
    fireEvent.change(field('WA_ALLOWED_RECIPIENTS'), { target: { value: '+966551234567' } });
    fireEvent.click(screen.getByRole('button', { name: s.saveValues }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith(GATE));
  });

  it('a secret (the token decides «configured»): the gate is asked again after the save', async () => {
    const spy = await renderPanel();
    apiSend.mockResolvedValue(integrationItems());
    fireEvent.change(field('LIVEKIT_API_SECRET'), { target: { value: 'fake-secret' } });
    const row = field('LIVEKIT_API_SECRET').closest('div.grid') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: s.saveSecret }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith(GATE));
  });
});

describe('the allow-list question starts clean', () => {
  it('an earlier failed save does not show an error before the admin answers', async () => {
    await renderPanel();
    apiSend.mockRejectedValueOnce(new Error('down'));
    fireEvent.change(field('WA_ALLOWED_RECIPIENTS'), { target: { value: '+966551234567' } });
    fireEvent.click(screen.getByRole('button', { name: s.saveValues }));
    expect(await screen.findByText(t.common.error)).toBeTruthy();
    fireEvent.change(field('WA_ALLOWED_RECIPIENTS'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: s.saveValues }));
    const dialog = screen.getByRole('dialog', { name: s.allowListEmptyTitle });
    expect(within(dialog).queryByText(t.common.error)).toBeNull();
  });
});
