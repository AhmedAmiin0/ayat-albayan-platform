import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ITEM,
  page,
  READ_ITEM,
  renderWithClient,
} from '@/features/notifications/notifications-test-kit';
import { t } from '@/lib/i18n/i18n';
import { MenuBar } from './MenuBar';
import { WideHeader } from '../layout/TopBarLayout';

const granted = vi.hoisted(() => new Set<string>());
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/dashboard/link-mock')).Link,
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: '/teacher' } }),
  useNavigate: () => vi.fn(),
}));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: [], can: (p: string) => granted.has(p) }),
}));

const follows = (a: Element, b: Element) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const menu = () => screen.getByRole('button', { name: t.nav.menu });
const settle = () => screen.findByText(t.bell.menuUnread.replace('{n}', '1'));

beforeEach(() => {
  granted.clear();
  granted.add('notifications.push');
  apiFetch.mockReset();
  apiFetch.mockResolvedValue(page([ITEM, READ_ITEM]));
});

describe('compact bar (< 900px): ONE button «القائمة»', () => {
  it('no bell in the bar; a saffron dot on «القائمة» while unread, its name exactly «القائمة»', async () => {
    renderWithClient(<MenuBar home="/teacher" title={t.nav.dashboard} />);
    await settle();
    expect(screen.getAllByRole('button')).toEqual([menu()]);
    expect(screen.queryByRole('button', { name: t.bell.open })).toBeNull();
    expect(menu().querySelector('[data-testid="menu-dot"]')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(menu().textContent).toBe(t.nav.menu);
    expect(menu().getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getByRole('button', { description: t.bell.menuUnread.replace('{n}', '1') })).toBe(
      menu(),
    );
  });

  it('no dot when everything is read', async () => {
    apiFetch.mockResolvedValue(page([READ_ITEM]));
    renderWithClient(<MenuBar home="/teacher" title={t.nav.dashboard} />);
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(menu().querySelector('[data-testid="menu-dot"]')).toBeNull();
    expect(menu().getAttribute('aria-describedby')).toBeNull();
  });

  it('without notifications.push: no dot, no request, no sheet row', () => {
    granted.clear();
    renderWithClient(<MenuBar home="/teacher" title={t.nav.dashboard} />);
    fireEvent.click(menu());
    expect(
      apiFetch.mock.calls.filter(([path]) => String(path).startsWith('/me/notifications')),
    ).toEqual([]);
    expect(screen.queryByRole('button', { name: t.bell.open })).toBeNull();
  });

  it('the sheet starts with «الإشعارات» (count in its name); a tap reveals the panel inline', async () => {
    renderWithClient(
      <MenuBar home="/teacher" title={t.nav.dashboard} nav={<nav aria-label={t.nav.label} />} />,
    );
    await settle();
    fireEvent.click(menu());
    const sheet = screen.getByRole('dialog', { name: t.nav.menu });
    const row = within(sheet).getByRole('button', { name: t.bell.openUnread.replace('{n}', '1') });
    expect(follows(row, within(sheet).getByRole('navigation'))).toBe(true);
    expect(row.getAttribute('aria-expanded')).toBe('false');
    expect(within(sheet).queryByRole('heading', { name: t.bell.title })).toBeNull();
    fireEvent.click(row);
    expect(within(sheet).getByRole('heading', { name: t.bell.title })).toBeTruthy();
    // Opening a row closes the sheet (a search-only navigation keeps the pathname).
    fireEvent.click(await within(sheet).findByRole('button', { name: new RegExp(ITEM.title) }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('wide header (≥ 900px) keeps the bell', () => {
  it('before language, theme and logout', async () => {
    renderWithClient(<WideHeader />);
    const bell = await screen.findByRole('button', { name: t.bell.openUnread.replace('{n}', '1') });
    expect(follows(bell, screen.getByRole('button', { name: t.auth.logout }))).toBe(true);
    expect(follows(bell, screen.getByRole('group', { name: t.theme.label }))).toBe(true);
  });
});
