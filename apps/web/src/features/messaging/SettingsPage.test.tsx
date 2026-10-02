import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n';
import { SETTINGS } from './settings-fixture';
import { SettingsPage } from './SettingsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const s = t.templates.settings;

function renderPage(messagingEnabled = false) {
  routeFetch(apiFetch, [
    ['/settings', { ...SETTINGS, messaging_enabled: messagingEnabled }],
    ['/messaging/templates', []],
  ]);
  renderWithClient(<SettingsPage />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('messaging kill switch (docs/12 §3.1)', () => {
  it('warns that the CRM owns the number, and turning sending ON asks first', async () => {
    renderPage(false);
    expect(await screen.findByText(s.crmWarning)).toBeTruthy();
    expect(screen.getByText(s.off)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: s.enableTitle }));
    const dialog = screen.getByRole('dialog', { name: s.enableTitle });
    expect(within(dialog).getByText(s.enableConfirm)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue({ ...SETTINGS, messaging_enabled: true });
    fireEvent.click(within(dialog).getByRole('button', { name: s.enableYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', { messagingEnabled: true }));
    expect(await screen.findByText(s.on)).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cancel keeps it off; turning it OFF is immediate', async () => {
    renderPage(true);
    apiSend.mockResolvedValue({ ...SETTINGS, messaging_enabled: false });
    fireEvent.click(await screen.findByRole('button', { name: s.disable }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', { messagingEnabled: false }));
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
});
