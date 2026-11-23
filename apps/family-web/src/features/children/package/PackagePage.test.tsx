import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { portalApi } from '@ab/web-kit/portal/portal.api-fixture';
import { home, kid } from '@ab/web-kit/portal/portal.fixtures';
import { renderAt } from '@/test/render-at';
import { PackagePage } from './PackagePage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const reads = () => apiFetch.mock.calls.map(([path]) => String(path));

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(portalApi());
});

describe('«الباقة» on its own page', () => {
  it('a guardian: the child\'s package, the amount due, back to the child\'s page', async () => {
    renderAt(<PackagePage home={home()} studentId="s2" />, '/package/s2');
    const title = `${t.portal.packageTab} · يوسف`;
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeTruthy();
    expect(await screen.findByText(t.portal.amountDue)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'يوسف' }).getAttribute('href')).toBe('/children/s2');
    expect(reads()).toContain('/portal/students/s2/package');
  });

  it('a child\'s own login: no «الباقة» heading and the package is never read', async () => {
    const own = kid();
    renderAt(<PackagePage home={home({ kind: 'student', students: [own] })} studentId="s1" />);
    expect(await screen.findByRole('heading', { level: 1, name: own.name })).toBeTruthy();
    expect(screen.getByText(t.portal.packageEmpty)).toBeTruthy();
    expect(screen.getByRole('link', { name: t.portal.app.tabs.home }).getAttribute('href'))
      .toBe('/portal');
    expect(reads().some((path) => path.endsWith('/package'))).toBe(false);
  });

  it('an adult who is their own student sees their package', async () => {
    const own = kid({ contact_is_self: true });
    renderAt(<PackagePage home={home({ kind: 'student', students: [own] })} studentId="s1" />);
    expect(await screen.findByText(t.portal.amountDue)).toBeTruthy();
  });

  it('a student the login does not have: «not found»', async () => {
    renderAt(<PackagePage home={home()} studentId="nobody" />);
    expect(await screen.findByText(t.common.notFound)).toBeTruthy();
    expect(reads()).toHaveLength(0);
  });
});
