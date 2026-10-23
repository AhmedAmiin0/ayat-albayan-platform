import {
  createBrowserHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider,
} from '@tanstack/react-router';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { useOauthReturn } from './use-oauth-return';

const c = t.googleSync.connection;

function Probe() {
  const { note } = useOauthReturn();
  return <p>{note ? `${note.tone}: ${note.message}` : 'none'}</p>;
}

/** «مزامنة Google» under a real router on the browser history (what the app does). */
async function renderAt(url: string) {
  window.history.replaceState(null, '', url);
  const root = createRootRoute({ component: Outlet });
  const google = createRoute({ getParentRoute: () => root, path: '/admin/settings/google', component: Probe });
  const router = createRouter({ routeTree: root.addChildren([google]), history: createBrowserHistory() });
  render(<RouterProvider router={router} />);
  await screen.findByText(/:|none/);
}

afterEach(() => window.history.replaceState(null, '', '/'));

describe('useOauthReturn on /admin/settings/google', () => {
  it('connected: the note shows once and the query leaves the URL, on the same page', async () => {
    await renderAt('/admin/settings/google?google=connected');
    expect(screen.getByText(`info: ${c.connected}`)).toBeTruthy();
    await waitFor(() => expect(window.location.search).toBe(''));
    expect(window.location.pathname).toBe('/admin/settings/google');
    expect(window.location.hash).toBe('');
  });

  it('error: the reason in words; the query is cleaned too', async () => {
    await renderAt('/admin/settings/google?google=error&reason=denied');
    expect(screen.getByText(`error: ${c.failed.replace('{reason}', c.reasons.denied)}`)).toBeTruthy();
    await waitFor(() => expect(window.location.search).toBe(''));
    expect(window.location.pathname).toBe('/admin/settings/google');
  });

  it('an old link with an anchor keeps the anchor', async () => {
    await renderAt('/admin/settings/google?google=connected#connection');
    await waitFor(() => expect(window.location.search).toBe(''));
    expect(window.location.hash).toBe('#connection');
  });

  it('no ?google=: no note and the URL is left alone', async () => {
    await renderAt('/admin/settings/google?x=1');
    expect(screen.getByText('none')).toBeTruthy();
    expect(window.location.search).toBe('?x=1');
  });

  it('without a router (component tests) the history is cleaned directly', async () => {
    window.history.replaceState(null, '', '/admin/settings/google?google=connected');
    const { result } = renderHook(() => useOauthReturn());
    expect(result.current.note?.tone).toBe('info');
    await waitFor(() => expect(window.location.search).toBe(''));
  });
});
