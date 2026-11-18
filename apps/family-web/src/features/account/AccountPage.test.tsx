import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { home, kid } from '@ab/web-kit/portal/portal.fixtures';
import { renderAt } from '@/test/render-at';
import { AccountPage } from './AccountPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/shell', () => ({
  usePickChild: () => vi.fn(),
  useFamilyPick: () => ({ state: 'choose' }),
}));

const A = t.portal.app.account;

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({ lessons: [] });
});

describe('«حسابي» (boards PortalWebAccount / PortalWebStudentAccount)', () => {
  it("a guardian: their own name and WhatsApp number as an LTR island, and the children", async () => {
    const guardian = { name: 'أحمد علي', phone: '+201001234567' };
    renderAt(<AccountPage home={home({ guardian })} />);
    expect(await screen.findByRole('heading', { level: 2, name: guardian.name })).toBeTruthy();
    const number = screen.getByText(guardian.phone);
    expect([number.tagName, number.getAttribute('dir')]).toEqual(['BDI', 'ltr']);
    expect(screen.queryByText(A.guardian)).toBeNull();
    expect(screen.getByRole('heading', { name: t.familyLook.account.children })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /AB-020/ })).toHaveLength(2);
    expect(screen.getByText(t.familyLook.account.lineGuardian)).toBeTruthy();
  });

  it('an older API without the guardian: the role word, no number', async () => {
    renderAt(<AccountPage home={home()} />);
    expect(await screen.findByRole('heading', { level: 2, name: A.guardian })).toBeTruthy();
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it('a student: name and code, no children list', async () => {
    const own = kid({ name: 'يوسف', code: 'AB-2041' });
    renderAt(<AccountPage home={home({ kind: 'student', students: [own], guardian: null })} />);
    expect(await screen.findByRole('heading', { level: 2, name: own.name })).toBeTruthy();
    expect(screen.getByText(A.student.replace('{code}', own.code))).toBeTruthy();
    expect(screen.queryByRole('heading', { name: t.familyLook.account.children })).toBeNull();
    expect(screen.getByText(t.familyLook.account.lineStudent)).toBeTruthy();
  });

  it('the settings and «تسجيل الخروج»', async () => {
    renderAt(<AccountPage home={home()} />);
    expect(await screen.findByRole('heading', { name: A.settings })).toBeTruthy();
    expect(screen.getByRole('group', { name: t.theme.label })).toBeTruthy();
    expect(screen.getByRole('group', { name: t.language.label })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.auth.logout })).toBeTruthy();
  });
});
