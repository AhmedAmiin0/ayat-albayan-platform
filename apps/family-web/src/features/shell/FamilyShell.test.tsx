import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { home, kid } from '@ab/web-kit/portal/portal.fixtures';
import { renderAt } from '@/test/render-at';
import { FamilyShell } from './FamilyShell';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const TABS = t.portal.app.tabs;

const answer = (unread: number) => (path: string) =>
  Promise.resolve(
    path.startsWith('/me/notifications')
      ? { items: [], unread }
      : home({ kind: 'student', students: [kid()] }),
  );

const navs = () => screen.getAllByRole('navigation', { name: t.familyWeb.nav });
const navAt = (place: string) => {
  const nav = navs().find((one) => one.dataset.place === place);
  if (!nav) throw new Error(`no ${place} nav`);
  return nav;
};

beforeEach(() => {
  apiFetch.mockReset();
});

describe('the family header (docs/51 §1a.2)', () => {
  it('the lockup links home under the academy name; the page renders in <main>', async () => {
    apiFetch.mockImplementation(answer(0));
    renderAt(<FamilyShell><p>page</p></FamilyShell>, '/schedule');
    const brand = await screen.findByRole('link', { name: t.familyLook.brand.name });
    expect(brand.getAttribute('href')).toBe('/portal');
    expect(screen.getByRole('main').textContent).toBe('page');
    expect(screen.getByRole('banner').contains(brand)).toBe(true);
  });

  it('the top pills and the bottom bar mark the page open with aria-current', async () => {
    apiFetch.mockImplementation(answer(0));
    renderAt(<FamilyShell><p>page</p></FamilyShell>, '/schedule?week=2');
    await screen.findAllByRole('link', { name: TABS.reports });
    expect(screen.getByRole('banner').contains(navAt('top'))).toBe(true);
    for (const place of ['top', 'bottom']) {
      const schedule = within(navAt(place)).getByRole('link', { name: TABS.schedule });
      expect(schedule.getAttribute('aria-current')).toBe('page');
      const homeTab = within(navAt(place)).getByRole('link', { name: TABS.home });
      expect(homeTab.getAttribute('aria-current')).toBeNull();
    }
  });

  it('the bell names the unread count; none unread → «الإشعارات»', async () => {
    apiFetch.mockImplementation(answer(3));
    renderAt(<FamilyShell><p>page</p></FamilyShell>, '/portal');
    const label = t.bell.openUnread.replace('{n}', '3');
    const bell = await screen.findByRole('link', { name: label });
    expect(bell.getAttribute('href')).toBe('/alerts');
  });

  it('no unread: the plain label, no badge', async () => {
    apiFetch.mockImplementation(answer(0));
    renderAt(<FamilyShell><p>page</p></FamilyShell>, '/portal');
    const bell = await screen.findByRole('link', { name: t.bell.open });
    expect(bell.textContent).toBe('');
  });
});
