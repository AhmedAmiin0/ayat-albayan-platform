import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { googleStatus } from '../google.fixture';
import { renderGoogle } from '../google-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const s = t.googleSync.connection;
const disconnected = { status: 'disconnected' as const, email: null, scopes: [] as string[], connected_at: null, last_error: null };

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  vi.unstubAllGlobals();
});

describe('Google connection card', () => {
  it('connected: chip, email, scopes, read-only redirect URI, reconnect and disconnect', async () => {
    renderGoogle({ apiFetch });
    expect(await screen.findByText(s.status.connected)).toBeTruthy();
    expect(screen.getByText('academy@example.test')).toBeTruthy();
    expect(screen.getByText('https://www.googleapis.com/auth/drive')).toBeTruthy();
    const uri = screen.getByLabelText(s.redirect) as HTMLInputElement;
    expect(uri.readOnly).toBe(true);
    expect(uri.value).toBe('http://localhost:3000/integrations/google/callback');
    expect(screen.getByRole('button', { name: s.reconnect })).toBeTruthy();
  });

  it('not configured: says where to enter the client and connect is disabled', async () => {
    renderGoogle({ apiFetch, status: googleStatus({ configured: false, connection: { ...disconnected } }) });
    expect(await screen.findByText(s.notConfigured)).toBeTruthy();
    expect((screen.getByRole('button', { name: s.connect }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: s.disconnect })).toBeNull();
  });

  it('connect asks the API for the consent URL and goes there', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign, search: '' });
    renderGoogle({ apiFetch, status: googleStatus({ connection: { ...disconnected } }), routes: [['/admin/google/connect', { url: 'https://consent.example.test/auth' }]] });
    fireEvent.click(await screen.findByRole('button', { name: s.connect }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://consent.example.test/auth'));
    expect(apiFetch).toHaveBeenCalledWith('/admin/google/connect');
  });

  it('an error shows the last error; disconnect asks first, then posts', async () => {
    const onNote = vi.fn();
    renderGoogle({ apiFetch, onNote, status: googleStatus({ connection: { ...googleStatus().connection, status: 'error', last_error: 'invalid_grant' } }) });
    expect(await screen.findByText(s.status.error)).toBeTruthy();
    expect(screen.getByText(s.lastError.replace('{error}', t.googleSync.errors.invalid_grant))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: s.disconnect }));
    const dialog = screen.getByRole('dialog', { name: s.disconnect });
    expect(within(dialog).getByText(s.disconnectConfirm)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue(googleStatus({ connection: { ...disconnected } }));
    fireEvent.click(within(dialog).getByRole('button', { name: s.disconnect }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/admin/google/disconnect'));
    await waitFor(() => expect(onNote).toHaveBeenCalledWith(s.disconnected));
    expect(await screen.findByText(s.status.disconnected)).toBeTruthy();
  });
});
