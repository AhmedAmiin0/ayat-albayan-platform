import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { googleStatus } from './google.fixture';
import { GoogleSection } from './GoogleSection';
import { renderGoogle } from './google-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const s = t.googleSync;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  window.history.replaceState(null, '', '/');
});

describe('Google section: states', () => {
  it('shows a skeleton while the status loads, then every block', async () => {
    renderGoogle({ apiFetch });
    expect(screen.getByTestId('google-skeleton').getAttribute('aria-busy')).toBe('true');
    expect(await screen.findByRole('heading', { name: s.connection.title })).toBeTruthy();
    for (const title of [s.switches.title, s.drive.title, s.teachers.title, s.students.title, s.log.title]) {
      expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    }
    expect(screen.getByText(s.gap)).toBeTruthy();
    // No role=status at rest: the settings page owns the one status region.
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('a failed status load says so and «إعادة المحاولة» asks again', async () => {
    apiFetch.mockRejectedValueOnce(new Error('down'));
    renderWithClient(<GoogleSection onNote={vi.fn()} />);
    expect(await screen.findByText(s.loadError)).toBeTruthy();
    routeFetch(apiFetch, [
      ['/admin/google/status', googleStatus()],
      ['/admin/google/teachers', []],
      ['/admin/google/students', []],
      ['/admin/google/items', []],
    ]);
    fireEvent.click(screen.getByRole('button', { name: s.retry }));
    expect(await screen.findByRole('heading', { name: s.connection.title })).toBeTruthy();
    expect(await screen.findByText(s.teachers.empty)).toBeTruthy();
    expect(await screen.findByText(s.students.empty)).toBeTruthy();
    expect(await screen.findByText(s.log.empty)).toBeTruthy();
  });
});

describe('OAuth return (?google=…)', () => {
  it('connected: an info toast, and the query leaves the URL (same page)', async () => {
    window.history.replaceState(null, '', '/admin/settings/google?google=connected');
    renderGoogle({ apiFetch });
    expect((await screen.findByRole('status')).textContent).toContain(s.connection.connected);
    await waitFor(() => expect(window.location.search).toBe(''));
    expect(window.location.pathname).toBe('/admin/settings/google');
    expect(window.location.hash).toBe('');
  });

  it('error: an error toast naming the reason', async () => {
    window.history.replaceState(null, '', '/admin/settings/google?google=error&reason=denied');
    renderGoogle({ apiFetch });
    expect((await screen.findByRole('status')).textContent).toContain(s.connection.failed.replace('{reason}', s.connection.reasons.denied));
    await waitFor(() => expect(window.location.search).toBe(''));
  });
});
