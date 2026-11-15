import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { home } from '@ab/web-kit/portal/portal.fixtures';
import { renderAt } from '@/test/render-at';
import { tabsOf } from './tab-links';
import { TabBar } from './TabBar';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const TABS = t.portal.app.tabs;
const names = () => screen.getAllByRole('link').map((link) => link.textContent);

beforeEach(() => apiFetch.mockReset());

describe('the family bar (owner 2026-11-15)', () => {
  it('a guardian: الرئيسية · الجدول · أبنائي · حسابي', async () => {
    apiFetch.mockResolvedValue(home({ kind: 'guardian' }));
    renderAt(<TabBar />, '/portal');
    const children = await screen.findByRole('link', { name: TABS.children });
    expect(children.getAttribute('href')).toBe('/children');
    expect(names()).toEqual([TABS.home, TABS.schedule, TABS.children, TABS.account]);
  });

  it('a student: الرئيسية · الجدول · التقارير · حسابي, never «أبنائي»', async () => {
    apiFetch.mockResolvedValue(home({ kind: 'student' }));
    renderAt(<TabBar />, '/portal');
    await screen.findByRole('link', { name: TABS.reports });
    expect(names()).toEqual([TABS.home, TABS.schedule, TABS.reports, TABS.account]);
  });

  it('until /portal/me answers, only the tabs every login has', () => {
    expect(tabsOf(undefined)).toEqual(['home', 'schedule', 'account']);
  });
});
