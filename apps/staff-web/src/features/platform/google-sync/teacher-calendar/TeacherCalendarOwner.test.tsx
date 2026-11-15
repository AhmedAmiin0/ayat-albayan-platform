import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { TeacherCalendarOwner } from './TeacherCalendarOwner';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/lib/http/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'x' } } }) } },
}));

const T = t.googleSync.teacherCalendar;
const VIEW = { teacher_id: 't1', owner: 'script', changed_at: null, managed: 4, script_event_present: 2 };

function show(role: string) {
  routeFetch(apiFetch, [
    ['/auth/me', { id: 'u1', email: null, role, permissions: ['settings.read', 'settings.write'] }],
    ['/admin/google/teachers/t1/calendar-owner', VIEW],
  ]);
  renderWithClient(<TeacherCalendarOwner teacherId="t1" />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('TeacherCalendarOwner («تقويم المعلم», docs/24)', () => {
  it('an admin sees the two sources, the warning and the sync status', async () => {
    show('admin');
    expect(await screen.findByRole('radio', { name: T.script })).toHaveProperty('checked', true);
    expect(screen.getByRole('radio', { name: T.platform })).toHaveProperty('checked', false);
    expect(screen.getByText(T.warning)).toBeTruthy();
    expect(screen.getByText(new RegExp(T.managed.replace('{n}', '4')))).toBeTruthy();
    expect(screen.getByText(new RegExp(T.scriptPresent.replace('{n}', '2')))).toBeTruthy();
  });

  it('switching to «من المنصة» sends the owner and shows the saved note', async () => {
    apiSend.mockResolvedValue({ ...VIEW, owner: 'platform', changed_at: '2026-10-28T08:00:00Z' });
    show('admin');
    fireEvent.click(await screen.findByRole('radio', { name: T.platform }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/admin/google/teachers/t1/calendar-owner', { owner: 'platform' }));
    expect(await screen.findByRole('status')).toHaveProperty('textContent', T.saved);
    expect(screen.getByRole('radio', { name: T.platform })).toHaveProperty('checked', true);
  });

  it('nothing for anyone but a base-role admin (no request either)', async () => {
    show('assistant');
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/auth/me'));
    expect(screen.queryByRole('radio')).toBeNull();
    expect(apiFetch).not.toHaveBeenCalledWith('/admin/google/teachers/t1/calendar-owner');
  });
});
