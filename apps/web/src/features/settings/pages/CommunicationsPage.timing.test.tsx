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

// The messages' timing fields (the registry's «messaging» rows), ported from the old page's one «حفظ».
describe('«ماذا يُرسل ومتى» timing fields', () => {
  it('the timing rows are here, not the other sections’ fields', async () => {
    renderCommunications({ apiFetch, tab: 'catalogue' });
    expect(await screen.findByLabelText(s.followUpHours)).toBeTruthy();
    expect(screen.queryByLabelText(t.settings.bookingHorizonWeeks)).toBeNull();
    expect(screen.queryByLabelText(t.settings.academyWhatsapp)).toBeNull();
  });

  it('«حفظ» sends the one PATCH /settings with the changed follow-up hours, then exactly one status', async () => {
    renderCommunications({ apiFetch, tab: 'catalogue' });
    fireEvent.change(await screen.findByLabelText(s.followUpHours), { target: { value: '24، 48' } });
    expect(screen.queryAllByRole('status')).toHaveLength(0);
    apiSend.mockResolvedValue(SETTINGS);
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', expect.objectContaining({ followUpHours: [24, 48], bookingHorizonWeeks: 5 })),
    );
    await waitFor(() => expect(screen.getAllByRole('status')).toHaveLength(1));
    expect(screen.getByRole('status').textContent).toContain(t.settings.saved);
  });

  it('hours out of order stay on screen with the reason; nothing is sent', async () => {
    renderCommunications({ apiFetch, tab: 'catalogue' });
    fireEvent.change(await screen.findByLabelText(s.followUpHours), { target: { value: '72، 24' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    expect((await screen.findAllByRole('alert')).map((a) => a.textContent)).toEqual([t.settings.notAscending]);
    expect(apiSend).not.toHaveBeenCalled();
  });
});
