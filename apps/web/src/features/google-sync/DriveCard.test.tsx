import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { googleStatus } from './google.fixture';
import { renderGoogle } from './google-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const s = t.googleSync.drive;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('Drive card', () => {
  it('shows what the search found and confirms the folder and the sheet by id', async () => {
    const onNote = vi.fn();
    renderGoogle({ apiFetch, onNote });
    expect(await screen.findByText('Root Reports Folder')).toBeTruthy();
    expect(screen.getByText('Summary Sheet')).toBeTruthy();
    const confirmed = googleStatus({
      drive: { root_folder_id: 'fake-root-folder-0001', root_folder_name: 'Root Reports Folder', summary_sheet_id: 'fake-summary-sheet-01', confirmed_at: '2026-10-22T09:00:00Z' },
    });
    apiSend.mockResolvedValue(confirmed);
    fireEvent.click(screen.getByRole('button', { name: s.confirm }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PUT', '/admin/google/drive', { root_folder_id: 'fake-root-folder-0001', summary_sheet_id: 'fake-summary-sheet-01' }),
    );
    await waitFor(() => expect(onNote).toHaveBeenCalledWith(s.saved));
    expect(await screen.findByText(t.googleSync.common.confirmed)).toBeTruthy();
    expect(screen.queryByRole('button', { name: s.confirm })).toBeNull();
  });

  it('never searched: says so; the search posts discover', async () => {
    renderGoogle({ apiFetch, status: googleStatus({ discovery: null }) });
    expect(await screen.findByText(s.never)).toBeTruthy();
    apiSend.mockResolvedValue(googleStatus());
    fireEvent.click(screen.getByRole('button', { name: s.discover }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/admin/google/discover'));
    expect(await screen.findByText('Root Reports Folder')).toBeTruthy();
  });

  it('the search needs a connected account', async () => {
    const connection = { status: 'disconnected' as const, email: null, scopes: [] as string[], connected_at: null, last_error: null };
    renderGoogle({ apiFetch, status: googleStatus({ connection, discovery: null }) });
    expect(((await screen.findByRole('button', { name: s.discover })) as HTMLButtonElement).disabled).toBe(true);
  });
});
