import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n';
import { CATALOGUE_ROUTE, SETTINGS } from '@/test/settings-fixture';
import { SettingsPage } from './SettingsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const s = t.templates.settings;

type Gate = { open: boolean; reason: 'not_configured' | 'switch_off' | null; queued: number };

function renderPage(messagingEnabled = false, gate: Gate = { open: messagingEnabled, reason: messagingEnabled ? null : 'switch_off', queued: 0 }) {
  routeFetch(apiFetch, [
    ['/settings/integrations', []],
    ['/settings', { ...SETTINGS, messaging_enabled: messagingEnabled }],
    CATALOGUE_ROUTE,
    ['/messages/gate', gate],
    ['/messaging/templates', []],
  ]);
  renderWithClient(<SettingsPage />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('messaging kill switch (docs/12 §3.1)', () => {
  it('warns that the CRM owns the number, and turning sending ON asks first, saying how many go out', async () => {
    renderPage(false, { open: false, reason: 'switch_off', queued: 5 });
    expect((await screen.findAllByText(s.crmWarning)).length).toBeGreaterThan(0);
    expect(screen.getByText(s.off)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: s.enableTitle }));
    const dialog = screen.getByRole('dialog', { name: s.enableTitle });
    expect(within(dialog).getByText(s.enableConfirm)).toBeTruthy();
    expect(within(dialog).getByText(new RegExp(s.queued.few.replace('{n}', '5')))).toBeTruthy();
    expect(document.activeElement?.textContent).toBe(t.common.cancel);
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue({ ...SETTINGS, messaging_enabled: true });
    fireEvent.click(within(dialog).getByRole('button', { name: s.enableYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/messages/gate/sending', { on: true, confirmText: s.enableYes }));
    expect(await screen.findByText(s.on)).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('turning it OFF asks first too (cancel is the default and changes nothing); cancel keeps it off', async () => {
    renderPage(true);
    apiSend.mockResolvedValue({ ...SETTINGS, messaging_enabled: false });
    fireEvent.click(await screen.findByRole('button', { name: s.disable }));
    const off = screen.getByRole('dialog', { name: s.disableTitle });
    expect(within(off).getByText(s.disableConfirm)).toBeTruthy();
    expect(document.activeElement?.textContent).toBe(t.common.cancel);
    fireEvent.click(within(off).getByRole('button', { name: t.common.cancel }));
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: s.disable }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: s.disableYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/messages/gate/sending', { on: false }));
    fireEvent.click(await screen.findByRole('button', { name: s.enableTitle }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t.common.cancel }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(apiSend).toHaveBeenCalledTimes(1);
  });
});

describe('academy settings form', () => {
  it('saves every setting in one PATCH; late cancel ON needs its hours', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('checkbox', { name: t.settings.lateCancel }));
    fireEvent.change(screen.getByLabelText(t.settings.lateCancelHours), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText(s.followUpHours), { target: { value: '24، 48' } });
    fireEvent.click(screen.getByRole('checkbox', { name: t.settings.payoutCountLate }));
    apiSend.mockResolvedValue(SETTINGS);
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith(
        'PATCH',
        '/settings',
        expect.objectContaining({ lateCancelHours: 12, followUpHours: [24, 48], payoutCountLate: true, bookingHorizonWeeks: 5 }),
      ),
    );
    expect(await screen.findByText(t.settings.saved)).toBeTruthy();
  });

  it('a bad number stays on screen with the reason; nothing is sent', async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText(t.settings.bookingHorizonWeeks), { target: { value: '40' } });
    fireEvent.change(screen.getByLabelText(s.followUpHours), { target: { value: '72، 24' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.map((a) => a.textContent)).toEqual([t.settings.notAscending, t.settings.invalid]);
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('WhatsApp not set up is named and the chip never says «يعمل»: the switch alone sends nothing', async () => {
    renderPage(true, { open: false, reason: 'not_configured', queued: 2 });
    expect(await screen.findByText(s.gateNotConfigured)).toBeTruthy();
    expect(screen.getByText(s.onBlocked)).toBeTruthy();
    expect(screen.queryByText(s.on)).toBeNull();
    expect(screen.getByText(s.queued.two)).toBeTruthy();
  });

  it('after the cut-over the owner retires the CRM warning', async () => {
    renderPage(false);
    apiSend.mockResolvedValue({ ...SETTINGS, crm_cutover_done: true });
    fireEvent.click(await screen.findByRole('button', { name: s.crmDone }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/messages/gate/cutover', { done: true }));
    await waitFor(() => expect(screen.queryByText(s.crmWarning)).toBeNull());
  });

  it('a rollback to the CRM turns the cut-over back off and the warning returns', async () => {
    routeFetch(apiFetch, [
      ['/settings/integrations', []],
      ['/settings', { ...SETTINGS, crm_cutover_done: true }],
      CATALOGUE_ROUTE,
      ['/messages/gate', { open: false, reason: 'switch_off', queued: 0 }],
      ['/messaging/templates', []],
    ]);
    renderWithClient(<SettingsPage />);
    expect(await screen.findByText(s.crmMoved)).toBeTruthy();
    apiSend.mockResolvedValue({ ...SETTINGS, crm_cutover_done: false });
    fireEvent.click(screen.getByRole('button', { name: s.crmUndo }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/messages/gate/cutover', { done: false }));
    expect((await screen.findAllByText(s.crmWarning)).length).toBeGreaterThan(0);
  });
});
