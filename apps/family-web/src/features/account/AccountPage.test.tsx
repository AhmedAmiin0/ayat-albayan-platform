import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { home, kid, soonLesson } from '@ab/web-kit/portal/portal.fixtures';
import { renderAt } from '@/test/render-at';
import { AccountPage } from './AccountPage';

const apiFetch = vi.hoisted(() => vi.fn());
const pick = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/shell', async () => {
  const fixtures = await import('@ab/web-kit/portal/portal.fixtures');
  return {
    usePickChild: () => pick,
    useFamilyPick: () => ({ state: 'one', student: fixtures.kid() }),
  };
});

const A = t.portal.app.account;
const guardian = { name: 'أحمد علي', phone: '+201001234567' };

beforeEach(() => {
  apiFetch.mockReset();
  pick.mockReset();
  apiFetch.mockResolvedValue({ lessons: [] });
});

describe('«حسابي»: who is in', () => {
  it('a guardian: their name, the WhatsApp number as an LTR island, the role label', async () => {
    renderAt(<AccountPage home={home({ guardian })} />);
    const title = { level: 1, name: t.portal.app.tabs.account };
    expect(await screen.findByRole('heading', title)).toBeTruthy();
    expect(await screen.findByRole('heading', { level: 2, name: guardian.name })).toBeTruthy();
    const number = screen.getByText(guardian.phone);
    expect([number.tagName, number.getAttribute('dir')]).toEqual(['BDI', 'ltr']);
    expect(screen.getByText(A.roleGuardian)).toBeTruthy();
  });

  it('an older API without the guardian: the role word as the heading, no number', async () => {
    renderAt(<AccountPage home={home({ guardian: null })} />);
    expect(await screen.findByRole('heading', { level: 2, name: A.guardian })).toBeTruthy();
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it('a student: name, code and «طالب», no children', async () => {
    const own = kid({ name: 'يوسف', code: 'AB-2041' });
    renderAt(<AccountPage home={home({ kind: 'student', students: [own], guardian: null })} />);
    expect(await screen.findByRole('heading', { level: 2, name: own.name })).toBeTruthy();
    expect(screen.getByText(own.code).tagName).toBe('BDI');
    expect(screen.getByText(A.roleStudent)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: A.children })).toBeNull();
  });

  it('the settings card and «تسجيل الخروج»', async () => {
    renderAt(<AccountPage home={home()} />);
    expect(await screen.findByRole('heading', { name: A.settings })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.auth.logout })).toBeTruthy();
  });

  it('the privacy policy and the deletion page, for guardians and students', async () => {
    renderAt(<AccountPage home={home({ kind: 'student', guardian: null })} />);
    const nav = await screen.findByRole('navigation', { name: t.legal.links.nav });
    expect(within(nav).getByRole('link', { name: t.legal.links.deleteAccount })).toBeTruthy();
  });
});

describe('«حسابي»: the children', () => {
  it('one row per child; the one in view is marked, the next teacher shows once read', async () => {
    apiFetch.mockResolvedValue({ lessons: [soonLesson()] });
    renderAt(<AccountPage home={home({ guardian })} />);
    expect(await screen.findByRole('heading', { name: A.children })).toBeTruthy();
    const rows = await screen.findAllByRole('button', { name: /AB-020/ });
    expect(rows).toHaveLength(2);
    expect(rows[0]?.getAttribute('aria-current')).toBe('true');
    expect(rows[0]?.textContent).toContain(A.inView);
    expect(rows[1]?.getAttribute('aria-current')).toBeNull();
    expect(rows[1]?.textContent).not.toContain(A.inView);
    await waitFor(() => expect(rows[1]?.textContent).toContain('أبرار'));
  });

  it('a tap switches to that child and goes home', async () => {
    const { router } = renderAt(<AccountPage home={home({ guardian })} />, '/account');
    fireEvent.click(await screen.findByRole('button', { name: /يوسف/ }));
    expect(pick).toHaveBeenCalledWith('s2');
    await waitFor(() => expect(router.state.location.pathname).toBe('/portal'));
  });

  it('a guardian who studies is «أنا», first', async () => {
    const self = kid({ id: 's3', code: 'AB-0203', name: 'أحمد', contact_is_self: true });
    const students = [kid(), self];
    renderAt(<AccountPage home={home({ guardian, students })} />);
    const rows = await screen.findAllByRole('button', { name: /AB-020/ });
    expect(rows[0]?.textContent).toContain(t.portal.app.pick.me);
  });
});
