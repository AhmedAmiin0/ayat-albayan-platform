import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { SETTINGS } from '@/test/settings-fixture';
import { renderCommunications } from './communications-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/inbox/test-utils')).MockLink,
}));

const s = t.templates.settings;
const head = () => screen.getByRole('group', { name: t.settingsPages.sendingNow });

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

// Ported from the old /admin/settings page: the kill switch lives on «التواصل» › «نظرة عامة» (docs/12 §3.1).
describe('messaging kill switch on «نظرة عامة»', () => {
  it('warns that the CRM owns the number, and turning sending ON asks first, saying how many go out', async () => {
    renderCommunications({ apiFetch, gate: { open: false, reason: 'switch_off', queued: 5 } });
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
    // The head follows the switch.
    await waitFor(() => expect(head().textContent).toBe(t.settingsPages.sendingState.replace('{state}', s.on)));
  });

  it('turning it OFF asks first too (cancel is the default and changes nothing); cancel keeps it off', async () => {
    renderCommunications({ apiFetch, settings: { messaging_enabled: true } });
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

  it('WhatsApp not set up is named and the chip never says «يعمل»: the switch alone sends nothing', async () => {
    renderCommunications({ apiFetch, settings: { messaging_enabled: true }, gate: { open: false, reason: 'not_configured', queued: 2 } });
    expect(await screen.findByText(s.gateNotConfigured)).toBeTruthy();
    expect(screen.getByText(s.onBlocked)).toBeTruthy();
    expect(screen.queryByText(s.on)).toBeNull();
    expect(screen.getByText(s.queued.two)).toBeTruthy();
    expect(head().textContent).toBe(t.settingsPages.sendingState.replace('{state}', s.onBlocked));
  });

  it('the CRM warning stays here; the cut-over itself is marked on «الحماية» (a link, no button)', async () => {
    renderCommunications({ apiFetch });
    expect((await screen.findAllByText(s.crmWarning)).length).toBeGreaterThan(0);
    const link = screen.getByRole('link', { name: t.communicationsHub.crmOpenSafety });
    expect(link.getAttribute('href')).toBe('/admin/settings/communications?tab=safety');
    expect(screen.queryByRole('button', { name: s.crmDone })).toBeNull();
  });

  it('after the cut-over: no warning, the line says so and links to «الحماية» to undo it', async () => {
    renderCommunications({ apiFetch, settings: { crm_cutover_done: true } });
    expect(await screen.findByText(s.crmMoved)).toBeTruthy();
    expect(screen.queryByText(s.crmWarning)).toBeNull();
    expect(screen.getByRole('link', { name: t.communicationsHub.crmOpenSafety })).toBeTruthy();
    expect(screen.queryByRole('button', { name: s.crmUndo })).toBeNull();
    expect(apiSend).not.toHaveBeenCalled();
  });
});
