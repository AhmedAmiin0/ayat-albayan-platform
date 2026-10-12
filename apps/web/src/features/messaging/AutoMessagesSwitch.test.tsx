import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n';
import { SETTINGS } from './settings-fixture';
import { SettingsPage } from './SettingsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const s = t.templates.settings;

function renderPage(auto: boolean, cutover = false) {
  routeFetch(apiFetch, [
    ['/settings/integrations', []],
    ['/settings', { ...SETTINGS, auto_messages_enabled: auto, crm_cutover_done: cutover }],
    ['/messages/gate', { open: false, reason: 'switch_off', queued: 0 }],
    ['/messaging/templates', []],
  ]);
  renderWithClient(<SettingsPage />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('automatic messages switch (settings.auto_messages_enabled, docs/09 cut-over)', () => {
  it('sits with the sending switch, OFF by default, with the Apps Script hint; ON sends only autoMessagesEnabled', async () => {
    renderPage(false);
    expect(await screen.findByText(s.autoMessages)).toBeTruthy();
    expect(screen.getByText(s.autoOff)).toBeTruthy();
    expect(screen.getByText(s.autoMessagesHint)).toBeTruthy();
    expect(screen.getByText(s.off)).toBeTruthy(); // the send gate is its own switch
    apiSend.mockResolvedValue({ ...SETTINGS, auto_messages_enabled: true });
    fireEvent.click(screen.getByRole('button', { name: s.autoEnable }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', { autoMessagesEnabled: true }));
    expect(await screen.findByText(s.autoOn)).toBeTruthy();
    expect(screen.getByText(s.off)).toBeTruthy();
  });

  it('turning it OFF is immediate', async () => {
    renderPage(true);
    apiSend.mockResolvedValue({ ...SETTINGS, auto_messages_enabled: false });
    fireEvent.click(await screen.findByRole('button', { name: s.autoDisable }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', { autoMessagesEnabled: false }));
    expect(await screen.findByText(s.autoOff)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledTimes(1);
  });

  it('a failed save says so and the switch keeps its state', async () => {
    renderPage(false);
    apiSend.mockRejectedValue(new Error('down'));
    fireEvent.click(await screen.findByRole('button', { name: s.autoEnable }));
    expect(await screen.findByText(t.common.error)).toBeTruthy();
    expect(screen.getByText(s.autoOff)).toBeTruthy();
  });

  it('ON before the cut-over is ticked: the admin’s turn (act, hollow) with the Apps Script check; settled once ticked', async () => {
    renderPage(true);
    const chip = () => screen.getByText(s.autoOn).closest('[data-tone]')?.getAttribute('data-tone');
    expect(await screen.findByText(s.autoCheckScript)).toBeTruthy();
    expect(chip()).toBe('act');
    cleanup();
    renderPage(true, true);
    expect(await screen.findByText(s.autoOn)).toBeTruthy();
    expect(chip()).toBe('ok');
    expect(screen.queryByText(s.autoCheckScript)).toBeNull();
  });
});
