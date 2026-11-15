import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { SETTINGS } from '@/test/settings-fixture';
import { renderCommunications } from './communications-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

const s = t.templates.settings;

function renderPage(auto: boolean, cutover = false) {
  renderCommunications({ apiFetch, settings: { auto_messages_enabled: auto, crm_cutover_done: cutover } });
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

// Ported from the old /admin/settings page: «التواصل» › «نظرة عامة».
describe('automatic messages switch (settings.auto_messages_enabled, docs/09 cut-over)', () => {
  it('sits with the sending switch, OFF by default, with the Apps Script hint; ON goes to PUT /messages/gate/auto', async () => {
    renderPage(false);
    expect(await screen.findByText(s.autoMessages)).toBeTruthy();
    expect(screen.getByText(s.autoOff)).toBeTruthy();
    expect(screen.getByText(s.autoMessagesHint)).toBeTruthy();
    expect(screen.getByText(s.off)).toBeTruthy(); // the send gate is its own switch
    apiSend.mockResolvedValue({ ...SETTINGS, auto_messages_enabled: true });
    fireEvent.click(screen.getByRole('button', { name: s.autoEnable }));
    const dialog = screen.getByRole('dialog', { name: s.autoEnable });
    expect(within(dialog).getByText(s.autoEnableConfirm)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: s.autoEnableYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/messages/gate/auto', { on: true, confirmText: s.autoEnableYes }));
    expect(await screen.findByText(s.autoOn)).toBeTruthy();
    expect(screen.getByText(s.off)).toBeTruthy();
  });

  it('turning it OFF asks first, saying what stops and what does not; cancel changes nothing', async () => {
    renderPage(true);
    apiSend.mockResolvedValue({ ...SETTINGS, auto_messages_enabled: false });
    fireEvent.click(await screen.findByRole('button', { name: s.autoDisable }));
    const dialog = screen.getByRole('dialog', { name: s.autoDisable });
    expect(within(dialog).getByText(s.autoDisableConfirm)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: t.common.cancel }));
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: s.autoDisable }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: s.autoDisableYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/messages/gate/auto', { on: false }));
    expect(await screen.findByText(s.autoOff)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledTimes(1);
  });

  it('a failed save says so and the switch keeps its state', async () => {
    renderPage(false);
    apiSend.mockRejectedValue(new Error('down'));
    fireEvent.click(await screen.findByRole('button', { name: s.autoEnable }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: s.autoEnableYes }));
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
