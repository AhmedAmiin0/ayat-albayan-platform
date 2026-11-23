import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/i18n';
import { home, kid } from '@ab/web-kit/testing';
import { renderAt } from '#/test/render-at.tsx';
import { TabBar } from './TabBar';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/http', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const TABS = t.portal.app.tabs;
const names = () => screen.getAllByRole('link').map((link) => link.textContent);

beforeEach(() => {
  apiFetch.mockReset();
});

describe('the family bar (owner 2026-11-16)', () => {
  it('a student: الرئيسية · الجدول · التقارير · حسابي', async () => {
    apiFetch.mockResolvedValue(home({ kind: 'student', students: [kid()] }));
    renderAt(<TabBar />, '/portal');
    const reports = await screen.findByRole('link', { name: TABS.reports });
    expect(reports.getAttribute('href')).toBe('/reports');
    expect(names()).toEqual([TABS.home, TABS.schedule, TABS.reports, TABS.account]);
  });

  it('a guardian of one child works as that child: «التقارير» too', async () => {
    apiFetch.mockResolvedValue(home({ kind: 'guardian', students: [kid()] }));
    renderAt(<TabBar />, '/portal');
    await screen.findByRole('link', { name: TABS.reports });
    expect(names()).toEqual([TABS.home, TABS.schedule, TABS.reports, TABS.account]);
  });

  it('until the student in view is known, no «التقارير»', async () => {
    apiFetch.mockReturnValue(new Promise(() => undefined));
    renderAt(<TabBar />, '/portal');
    await screen.findByRole('link', { name: TABS.home });
    expect(names()).toEqual([TABS.home, TABS.schedule, TABS.account]);
  });

  it('the current page is aria-current, «التقارير» also on one report; the tile is placed on it', async () => {
    apiFetch.mockResolvedValue(home({ kind: 'student', students: [kid()] }));
    const { container } = renderAtWith('/report/r1');
    const reports = await screen.findByRole('link', { name: TABS.reports });
    expect(reports.getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: TABS.home }).getAttribute('aria-current')).toBeNull();
    const tile = container.querySelector('.ab-indicator');
    expect(tile?.hasAttribute('hidden')).toBe(false);
  });

  it('keeps the fourth slot while /portal/me loads (the bar never jumps)', async () => {
    apiFetch.mockReturnValue(new Promise(() => undefined));
    const { container } = renderAtWith('/portal');
    await screen.findByRole('link', { name: TABS.home });
    expect(container.querySelectorAll('nav li')).toHaveLength(4);
  });
});

function renderAtWith(path: string) {
  const out = renderAt(<TabBar />, path);
  return { ...out, container: document.body };
}
