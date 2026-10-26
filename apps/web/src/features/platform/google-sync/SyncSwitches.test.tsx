import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { googleStatus } from './google.fixture';
import { renderGoogle } from './google-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const s = t.googleSync.switches;
const c = t.googleSync.confirm;
const fill = (text: string, key: string, value: string) => text.replace(`{${key}}`, value);

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('Google switches', () => {
  it('live mode asks first and names the calendars and the folder it will write into', async () => {
    const status = googleStatus({ drive: { root_folder_id: 'fake-root-folder-0001', root_folder_name: 'Root Reports Folder', summary_sheet_id: null, confirmed_at: '2026-10-22T08:00:00Z' } });
    renderGoogle({ apiFetch, status });
    fireEvent.click(await screen.findByRole('button', { name: s.live }));
    const dialog = screen.getByRole('dialog', { name: c.liveTitle });
    expect(within(dialog).getByText(fill(c.mainCalendar, 'name', 'Main Academy Calendar'))).toBeTruthy();
    const teachers = within(dialog).getByText(/Calendar Teacher A/);
    expect(teachers.textContent).toContain('Calendar Teacher B');
    expect(within(dialog).getByText(fill(c.rootFolder, 'name', 'Root Reports Folder'))).toBeTruthy();
    expect(within(dialog).getByText(c.oldScript)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue(googleStatus({ settings: { enabled: true, mode: 'live', window_days: 60 } }));
    fireEvent.click(within(dialog).getByRole('button', { name: c.ok }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/admin/google/settings', { mode: 'live' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: s.live }).getAttribute('aria-pressed')).toBe('true');
  });

  it('with nothing mapped the live confirmation says so; cancel sends nothing', async () => {
    renderGoogle({ apiFetch, status: googleStatus({ targets: { main_calendar: 'Main Academy Calendar', teacher_calendars: [] } }) });
    fireEvent.click(await screen.findByRole('button', { name: s.live }));
    const dialog = screen.getByRole('dialog', { name: c.liveTitle });
    expect(within(dialog).getByText(c.noTeacherCalendars)).toBeTruthy();
    expect(within(dialog).getByText(c.noRootFolder)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: c.cancel }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('turning sync on asks first; turning it off is immediate', async () => {
    renderGoogle({ apiFetch, status: googleStatus({ settings: { enabled: false, mode: 'dry_run', window_days: 60 } }) });
    fireEvent.click(await screen.findByRole('button', { name: c.enableOk }));
    const dialog = screen.getByRole('dialog', { name: c.enableTitle });
    apiSend.mockResolvedValue(googleStatus());
    fireEvent.click(within(dialog).getByRole('button', { name: c.enableOk }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/admin/google/settings', { enabled: true }));
    fireEvent.click(await screen.findByRole('button', { name: t.googleSync.web.disable }));
    await waitFor(() => expect(apiSend).toHaveBeenLastCalledWith('PUT', '/admin/google/settings', { enabled: false }));
  });

  it('the window field refuses a number out of range and saves a good one', async () => {
    const onNote = vi.fn();
    renderGoogle({ apiFetch, onNote });
    const field = (await screen.findByLabelText(s.window)) as HTMLInputElement;
    expect(field.value).toBe('60');
    fireEvent.change(field, { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: t.googleSync.web.save }));
    expect(await screen.findByText(t.googleSync.web.windowInvalid.replace('{min}', '7').replace('{max}', '180'))).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue(googleStatus());
    fireEvent.change(field, { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: t.googleSync.web.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/admin/google/settings', { window_days: 90 }));
    await waitFor(() => expect(onNote).toHaveBeenCalledWith(s.saved));
  });
});
