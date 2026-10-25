import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { AdminNav } from '../../AdminNav';
import { MenuBar } from './MenuBar';

const path = vi.hoisted(() => ({ current: '/admin/students' }));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/dashboard/link-mock')).Link,
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: path.current } }),
  useNavigate: () => vi.fn(),
}));

const apiFetch = vi.hoisted(() => vi.fn(() => Promise.reject(new Error('offline'))));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const nav = (
  <nav aria-label={t.nav.label}>
    <a href="/admin/teachers">{t.nav.teachers}</a>
  </nav>
);
const bar = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MenuBar home="/admin" title={t.nav.students} nav={nav} email="admin@example.com" />
    </QueryClientProvider>,
  );

describe('MenuBar — the compact bar under 900px', () => {
  it('one bar: the mark (home link), the page title (no second heading) and «القائمة»', () => {
    bar();
    expect(screen.getByRole('link', { name: t.app.name }).getAttribute('href')).toBe('/admin');
    expect(document.querySelector('[data-bar-title]')?.getAttribute('data-bar-title')).toBe(t.nav.students);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getByRole('button', { name: t.nav.menu }).className).toContain('min-h-11');
  });

  it('«القائمة» opens the nav in a sheet with theme, language and logout at its foot', () => {
    bar();
    fireEvent.click(screen.getByRole('button', { name: t.nav.menu }));
    const sheet = screen.getByRole('dialog', { name: t.nav.menu });
    expect(within(sheet).getByRole('navigation', { name: t.nav.label })).toBeTruthy();
    expect(within(sheet).getByRole('button', { name: t.auth.logout })).toBeTruthy();
    expect(within(sheet).getByRole('group', { name: t.theme.label })).toBeTruthy();
    expect(within(sheet).getByText('admin@example.com')).toBeTruthy();
    expect(within(sheet).getByRole('link', { name: new RegExp(t.account.nav) }).getAttribute('href')).toBe('/account');
  });

  it('a link in the sheet closes it', () => {
    bar();
    fireEvent.click(screen.getByRole('button', { name: t.nav.menu }));
    fireEvent.click(screen.getByRole('link', { name: t.nav.teachers }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the sheet renders the same permission-filtered nav as the sidebar (dynamic roles)', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MenuBar home="/admin" title={t.payments.title} nav={<AdminNav can={(p) => p === 'payments.read'} />} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: t.nav.menu }));
    const nav = within(screen.getByRole('dialog', { name: t.nav.menu })).getByRole('navigation', { name: t.nav.label });
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual([t.payments.title]);
  });
});
