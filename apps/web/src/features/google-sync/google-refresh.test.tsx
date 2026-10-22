import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { googleStatus, googleTeachers } from './google.fixture';
import { renderGoogle } from './google-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

// What a mapping or a search changes elsewhere in the section is fetched again, not left stale.
const calls = (prefix: string) => apiFetch.mock.calls.filter(([p]) => String(p).startsWith(prefix)).length;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('Google section refreshes', () => {
  it('a confirmed teacher calendar refreshes the status (the live confirmation lists it) and the log', async () => {
    renderGoogle({ apiFetch });
    const row = (await screen.findByText('Teacher A')).closest('li') as HTMLElement;
    await waitFor(() => expect(calls('/admin/google/items')).toBe(1));
    const status = calls('/admin/google/status');
    apiSend.mockResolvedValue(googleTeachers());
    fireEvent.click(within(row).getByRole('button', { name: t.googleSync.common.confirm }));
    await waitFor(() => expect(calls('/admin/google/status')).toBeGreaterThan(status));
    await waitFor(() => expect(calls('/admin/google/items')).toBe(2));
  });

  it('«ابحث في Google» refreshes the student suggestions too', async () => {
    renderGoogle({ apiFetch });
    await screen.findByText('Teacher A');
    await waitFor(() => expect(calls('/admin/google/students')).toBe(1));
    apiSend.mockResolvedValue(googleStatus());
    fireEvent.click(screen.getByRole('button', { name: t.googleSync.drive.discover }));
    await waitFor(() => expect(calls('/admin/google/students')).toBe(2));
  });

  it('turning sync on while the mode is live asks with the confirmation that names the targets', async () => {
    renderGoogle({ apiFetch, status: googleStatus({ settings: { enabled: false, mode: 'live', window_days: 60 } }) });
    fireEvent.click(await screen.findByRole('button', { name: t.googleSync.confirm.enableOk }));
    const dialog = screen.getByRole('dialog', { name: t.googleSync.confirm.liveTitle });
    expect(within(dialog).getByText(/Calendar Teacher A/)).toBeTruthy();
    apiSend.mockResolvedValue(googleStatus());
    fireEvent.click(within(dialog).getByRole('button', { name: t.googleSync.confirm.ok }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/admin/google/settings', { enabled: true }));
  });
});
