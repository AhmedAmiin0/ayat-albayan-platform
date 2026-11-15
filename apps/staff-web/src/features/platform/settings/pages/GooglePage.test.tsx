import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleItems, googleStatus, googleStudents, googleTeachers } from '@/features/platform/google-sync/google.fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { GooglePage } from './GooglePage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

const g = t.googleSync;

function renderPage() {
  routeFetch(apiFetch, [
    ['/admin/google/status', googleStatus()],
    ['/admin/google/teachers', googleTeachers()],
    ['/admin/google/students', googleStudents()],
    ['/admin/google/items', googleItems()],
  ]);
  renderWithClient(<GooglePage />);
}

afterEach(() => {
  apiFetch.mockReset();
  window.history.replaceState(null, '', '/');
});

describe('«مزامنة Google» page', () => {
  it('its own title, then every Google card as before', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(t.settingsPages.google);
    expect(screen.getByRole('heading', { name: g.title })).toBeTruthy();
    for (const title of [g.connection.title, g.switches.title, g.drive.title, g.teachers.title, g.students.title, g.log.title]) {
      expect(await screen.findByRole('heading', { name: title })).toBeTruthy();
    }
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('back from Google (?google=connected): the note shows and the query leaves the URL', async () => {
    window.history.replaceState(null, '', '/admin/settings/google?google=connected');
    renderPage();
    expect((await screen.findByRole('status')).textContent).toContain(g.connection.connected);
    await waitFor(() => expect(window.location.search).toBe(''));
    expect(window.location.pathname).toBe('/admin/settings/google');
  });
});
