import { formatPhone } from '@ab/shared';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { home, kid } from '@ab/web-kit/portal/portal.fixtures';
import { renderAt } from '@/test/render-at';
import { ProfilePage } from './ProfilePage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

// A made-up number and fake names only.
const PHONE = '+966500000005';
const P = t.portal.app.profile;
const A = t.portal.app.account;
const profile = (over: Record<string, unknown> = {}) => ({
  id: 'p1', full_name: 'أم سارة', email: null, phone_e164: PHONE, avatar_url: null,
  role: { base: null, key: null, name_ar: null, name_en: null }, ...over,
});

beforeEach(() => {
  apiFetch.mockReset();
});

describe('«الملف الشخصي»', () => {
  it('a guardian: the number as an LTR island, no placeholder email, links to each child', async () => {
    apiFetch.mockResolvedValue(profile({ email: 'p1@family.invalid' }));
    renderAt(<ProfilePage home={home()} />, '/profile');
    expect(await screen.findByRole('heading', { level: 1, name: P.title })).toBeTruthy();
    expect(await screen.findByRole('heading', { level: 2, name: 'أم سارة' })).toBeTruthy();
    expect(screen.getByText(A.guardian)).toBeTruthy();
    expect(screen.getByText(formatPhone(PHONE)).getAttribute('dir')).toBe('ltr');
    expect(screen.queryByText(P.email)).toBeNull();
    expect(screen.queryByText(/\.invalid/)).toBeNull();
    const child = screen.getByRole('link', { name: /يوسف/ });
    expect(child.getAttribute('href')).toBe('/children/s2');
    expect(apiFetch).toHaveBeenCalledWith('/me/profile');
  });

  it('a student: their code and a real email, no children, the note', async () => {
    const own = kid({ name: 'يوسف', code: 'AB-2041' });
    apiFetch.mockResolvedValue(profile({ full_name: 'يوسف', email: 'student@example.com',
      phone_e164: null }));
    renderAt(<ProfilePage home={home({ kind: 'student', students: [own] })} />, '/profile');
    expect(await screen.findByText('student@example.com')).toBeTruthy();
    expect(screen.getByText(A.student.replace('{code}', 'AB-2041'))).toBeTruthy();
    expect(screen.queryByText(P.whatsapp)).toBeNull();
    expect(screen.queryByRole('heading', { name: A.children })).toBeNull();
    expect(screen.getByText(P.note)).toBeTruthy();
  });

  it('a failed read offers a retry, and the way back to «حسابي»', async () => {
    apiFetch.mockRejectedValue(new Error('offline'));
    renderAt(<ProfilePage home={home()} />, '/profile');
    expect(await screen.findByRole('button', { name: t.portal.retry })).toBeTruthy();
    const back = screen.getByRole('link', { name: t.portal.app.tabs.account });
    expect(back.getAttribute('href')).toBe('/account');
  });
});
