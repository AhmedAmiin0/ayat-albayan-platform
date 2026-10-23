import { fireEvent, screen, waitFor } from '@testing-library/react';
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

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

// «مواعيد الرسائل» (its own tab, D14): the registry's «messaging» rows and their one «حفظ».
describe('«مواعيد الرسائل» timing fields', () => {
  it('the timing rows are here, not the other sections’ fields', async () => {
    renderCommunications({ apiFetch, tab: 'timing' });
    expect(await screen.findByLabelText(s.followUpHours)).toBeTruthy();
    expect(screen.queryByLabelText(t.settings.bookingHorizonWeeks)).toBeNull();
    expect(screen.queryByLabelText(t.settings.academyWhatsapp)).toBeNull();
  });

  it('«حفظ» sends only the changed follow-up hours (never «القيم» keys), then exactly one status', async () => {
    renderCommunications({ apiFetch, tab: 'timing' });
    fireEvent.change(await screen.findByLabelText(s.followUpHours), { target: { value: '24، 48' } });
    expect(screen.queryAllByRole('status')).toHaveLength(0);
    apiSend.mockResolvedValue({ saved: ['followUpHours'], moved: [] });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', { followUpHours: [24, 48] }));
    const body = apiSend.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(body).not.toHaveProperty('bookingHorizonWeeks');
    await waitFor(() => expect(screen.getAllByRole('status')).toHaveLength(1));
    expect(screen.getByRole('status').textContent).toContain(t.settings.saved);
  });

  it('a key another page owns comes back moved: «تُدار من صفحة أخرى», the edit stays', async () => {
    renderCommunications({ apiFetch, tab: 'timing' });
    const hours = await screen.findByLabelText(s.followUpHours);
    fireEvent.change(hours, { target: { value: '24، 48' } });
    apiSend.mockResolvedValue({ saved: [], moved: ['followUpHours'] });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain(t.settingsValues.moved));
    expect((hours as HTMLInputElement).value).toBe('24، 48');
  });

  it('hours out of order stay on screen with the reason; nothing is sent', async () => {
    renderCommunications({ apiFetch, tab: 'timing' });
    fireEvent.change(await screen.findByLabelText(s.followUpHours), { target: { value: '72، 24' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    expect((await screen.findAllByRole('alert')).map((a) => a.textContent)).toEqual([t.settings.notAscending]);
    expect(apiSend).not.toHaveBeenCalled();
    expect(SETTINGS.follow_up_hours).not.toEqual([72, 24]);
  });
});
