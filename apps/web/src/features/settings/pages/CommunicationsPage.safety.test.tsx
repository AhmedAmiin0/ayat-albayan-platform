import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { integrationItems } from '@/features/integrations/integrations.fixture';
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

const h = t.communicationsHub;
const s = t.integrations;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

// docs/23 §2d tab 5, docs/26b §6a 1.2–1.3 (ADDED confirm both ways), 10.16–10.21.
describe('«التواصل» › «الحماية»', () => {
  it('marking the CRM cut-over asks first (cancel focused, nothing sent); yes writes it', async () => {
    renderCommunications({ apiFetch, tab: 'safety' });
    expect(await screen.findByText(h.crmPendingState)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: h.crmMark }));
    const dialog = screen.getByRole('dialog', { name: h.crmMarkTitle });
    expect(within(dialog).getByText(h.crmMarkConfirm)).toBeTruthy();
    expect(document.activeElement?.textContent).toBe(t.common.cancel);
    fireEvent.click(within(dialog).getByRole('button', { name: t.common.cancel }));
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue({ ...SETTINGS, crm_cutover_done: true });
    fireEvent.click(screen.getByRole('button', { name: h.crmMark }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: h.crmMarkYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/messages/gate/cutover', { done: true }));
    expect(await screen.findByText(h.crmDoneState)).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('unmarking asks first too, then brings the warning back', async () => {
    renderCommunications({ apiFetch, tab: 'safety', settings: { crm_cutover_done: true } });
    fireEvent.click(await screen.findByRole('button', { name: h.crmUnmark }));
    const dialog = screen.getByRole('dialog', { name: h.crmUnmarkTitle });
    expect(document.activeElement?.textContent).toBe(t.common.cancel);
    apiSend.mockResolvedValue({ ...SETTINGS, crm_cutover_done: false });
    fireEvent.click(within(dialog).getByRole('button', { name: h.crmUnmarkYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/messages/gate/cutover', { done: false }));
    expect(await screen.findByText(h.crmPendingState)).toBeTruthy();
  });

  it('the test guards and Kapso, only those groups', async () => {
    renderCommunications({ apiFetch, tab: 'safety', integrations: integrationItems() });
    expect(await screen.findByRole('group', { name: s.groups.wa_safety })).toBeTruthy();
    expect(screen.getByRole('group', { name: s.groups.kapso })).toBeTruthy();
    expect(screen.getByLabelText(s.keys.WA_ALLOWED_RECIPIENTS.label)).toBeTruthy();
    expect(screen.queryByRole('group', { name: s.groups.wa_notifications })).toBeNull();
    expect(screen.queryByRole('group', { name: s.groups.livekit })).toBeNull();
    expect(screen.getByText(h.safetyIntro)).toBeTruthy();
  });

  it('the CRM state chip sits in a polite live region (the toast keeps the only role=status)', async () => {
    renderCommunications({ apiFetch, tab: 'safety' });
    const chip = await screen.findByText(h.crmPendingState);
    expect(chip.closest('[aria-live="polite"]')).toBeTruthy();
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('emptying the allow-list asks first; only yes sends exactly {WA_ALLOWED_RECIPIENTS: null}', async () => {
    const items = integrationItems().map((i) =>
      i.key === 'WA_ALLOWED_RECIPIENTS' ? { ...i, value: '+201001234567', source: 'db' as const, set: true } : i,
    );
    renderCommunications({ apiFetch, tab: 'safety', integrations: items });
    const guards = await screen.findByRole('region', { name: t.settingsPages.communicationsTabs.safety });
    fireEvent.change(await within(guards).findByLabelText(s.keys.WA_ALLOWED_RECIPIENTS.label), { target: { value: '' } });
    fireEvent.click(within(guards).getByRole('button', { name: s.saveValues }));
    const dialog = screen.getByRole('dialog', { name: s.allowListEmptyTitle });
    expect(within(dialog).getByText(s.allowListEmptyConfirm)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue(integrationItems());
    fireEvent.click(within(dialog).getByRole('button', { name: s.allowListEmptyYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    expect(apiSend).toHaveBeenCalledWith('PUT', '/settings/integrations', { values: { WA_ALLOWED_RECIPIENTS: null } });
  });
});
