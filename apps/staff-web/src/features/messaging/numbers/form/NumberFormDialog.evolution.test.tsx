import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { evolutionView } from '@/features/messaging/numbers/numbers.fixture';
import { renderPanel } from '@/features/messaging/numbers/numbers-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: [], can: () => true }),
}));

const n = t.numbers;
const e = n.evolution;

async function openAddOnEvolution() {
  renderPanel(apiFetch);
  await screen.findByRole('article', { name: 'Notifications line' });
  fireEvent.click(screen.getByRole('button', { name: n.actions.add }));
  const dialog = screen.getByRole('dialog', { name: n.form.addTitle });
  fireEvent.change(within(dialog).getByLabelText(n.fields.provider), { target: { value: 'evolution' } });
  return dialog;
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«إضافة رقم» on Evolution', () => {
  it('offers Evolution; shows the instance name, the engine and the switch, not the Meta ids', async () => {
    const dialog = await openAddOnEvolution();
    expect(within(dialog).getByRole('option', { name: n.provider.evolution })).toBeTruthy();
    expect(within(dialog).getByLabelText(e.instance, { exact: false })).toBeTruthy();
    expect(within(dialog).getByText(e.instanceHint)).toBeTruthy();
    expect(within(dialog).queryByLabelText(n.fields.waba_id)).toBeNull();
    expect(within(dialog).queryByLabelText(n.fields.app_id)).toBeNull();
    expect(within(dialog).getByLabelText<HTMLSelectElement>(e.modeLabel).value).toBe('baileys');
    expect(within(dialog).getByText(e.banRisk)).toBeTruthy();
    expect(within(dialog).getByLabelText<HTMLInputElement>(e.autoSends).checked).toBe(false);
  });

  it('on Cloud: the Meta-rules hint and no automatic-sends switch', async () => {
    const dialog = await openAddOnEvolution();
    fireEvent.change(within(dialog).getByLabelText(e.modeLabel), { target: { value: 'cloud' } });
    expect(within(dialog).getByText(e.cloudHint)).toBeTruthy();
    expect(within(dialog).queryByText(e.banRisk)).toBeNull();
    expect(within(dialog).queryByLabelText(e.autoSends)).toBeNull();
  });

  it('POSTs the instance name with the engine and the switch', async () => {
    const dialog = await openAddOnEvolution();
    fireEvent.change(within(dialog).getByLabelText(n.fields.label, { exact: false }), { target: { value: 'Staff' } });
    const instance = within(dialog).getByLabelText(e.instance, { exact: false });
    fireEvent.change(instance, { target: { value: 'academy-staff' } });
    fireEvent.click(within(dialog).getByLabelText(e.autoSends));
    apiSend.mockResolvedValue(evolutionView());
    fireEvent.click(within(dialog).getByRole('button', { name: n.actions.save }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/admin/numbers', {
        label: 'Staff', purpose: 'notifications', provider: 'evolution', phone_number_id: 'academy-staff',
        waba_id: null, app_id: null, enabled: false, evolution_mode: 'baileys', evolution_auto_sends: true,
      }),
    );
  });
});
