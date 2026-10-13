import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { flushSync } from 'react-dom';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { MenuBar } from './MenuBar';

// Owner report 2026-10-13: picking a page from «القائمة» (< 900px) reloaded the whole app. A real
// tap runs a microtask checkpoint between the capture and the bubble phase; closing the sheet in
// the capture phase unmounted it there, so the link's own onClick (preventDefault + client
// navigation) never ran and the browser followed the href. The listener on the link replays that
// checkpoint (flushSync = React's pending sync render) at the target phase.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: '/admin/students' } }),
  useNavigate: () => vi.fn(),
}));
const apiFetch = vi.hoisted(() => vi.fn(() => Promise.reject(new Error('offline'))));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const navigate = vi.fn();
/** A client-side link, as TanStack's Link: it cancels the browser's navigation and routes itself. */
const nav = (
  <a
    href="/admin/teachers"
    onClick={(e) => {
      e.preventDefault();
      navigate('/admin/teachers');
    }}
  >
    {t.nav.teachers}
  </a>
);

describe('MenuBar — picking a page from the sheet', () => {
  it('stays a client-side navigation (no full page reload) and closes the sheet', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MenuBar home="/admin" title={t.nav.students} nav={nav} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: t.nav.menu }));
    const link = screen.getByRole('link', { name: t.nav.teachers });
    link.addEventListener('click', () => flushSync(() => undefined)); // the browser's checkpoint
    const allowed = link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    expect(allowed).toBe(false); // default prevented: the browser does not load /admin/teachers
    expect(navigate).toHaveBeenCalledWith('/admin/teachers');
    await act(async () => undefined);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
