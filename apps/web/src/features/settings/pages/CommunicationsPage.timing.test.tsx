import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { renderCommunications } from './communications-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/inbox/test-utils')).MockLink,
}));

const s = t.templates.settings;
const lookahead = t.settings.reminderLookaheadHours;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

// «مواعيد الرسائل» (its own tab, D14): the engine's own timing fields and their one «حفظ». The 8 keys
// the notification rules own (RULE_SETTING_KEYS, docs/23b §1) are edited on «الإشعارات» instead.
describe('«مواعيد الرسائل» timing fields', () => {
  it('the lookahead and the quick-reply window stay; the reminder and follow-up timings moved, with a link', async () => {
    renderCommunications({ apiFetch, tab: 'timing' });
    expect(await screen.findByLabelText(lookahead)).toBeTruthy();
    expect(screen.getByLabelText(t.settings.quickReplyWindowHours)).toBeTruthy();
    for (const moved of [s.followUpHours, s.reminderMinutesBefore, s.reminder24hEnabled, s.teacherWhatsappNewStudent]) {
      expect(screen.queryByLabelText(moved)).toBeNull();
    }
    expect(screen.queryByLabelText(t.settings.bookingHorizonWeeks)).toBeNull();
    expect(screen.getByText(t.notificationRules.timingMoved)).toBeTruthy();
    const link = screen.getByRole('link', { name: t.notificationRules.timingMovedLink });
    expect(link.getAttribute('href')).toBe('/admin/settings/communications?tab=catalogue');
  });

  it('«حفظ» sends only the changed lookahead (never a moved key), then exactly one status', async () => {
    renderCommunications({ apiFetch, tab: 'timing' });
    fireEvent.change(await screen.findByLabelText(lookahead), { target: { value: '30' } });
    expect(screen.queryAllByRole('status')).toHaveLength(0);
    apiSend.mockResolvedValue({ saved: ['reminderLookaheadHours'], moved: [] });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', { reminderLookaheadHours: 30 }));
    const body = apiSend.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(body).not.toHaveProperty('followUpHours');
    await waitFor(() => expect(screen.getAllByRole('status')).toHaveLength(1));
    expect(screen.getByRole('status').textContent).toContain(t.settings.saved);
  });

  it('a key another page owns comes back moved: «تُدار من صفحة أخرى», the edit stays', async () => {
    renderCommunications({ apiFetch, tab: 'timing' });
    const box = await screen.findByLabelText(lookahead);
    fireEvent.change(box, { target: { value: '30' } });
    apiSend.mockResolvedValue({ saved: [], moved: ['reminderLookaheadHours'] });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain(t.settingsValues.moved));
    expect((box as HTMLInputElement).value).toBe('30');
  });

  it('out of bounds stays on screen with the reason; nothing is sent', async () => {
    renderCommunications({ apiFetch, tab: 'timing' });
    fireEvent.change(await screen.findByLabelText(lookahead), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    expect((await screen.findAllByRole('alert')).map((a) => a.textContent)).toEqual([t.settings.invalid]);
    expect(apiSend).not.toHaveBeenCalled();
  });
});
