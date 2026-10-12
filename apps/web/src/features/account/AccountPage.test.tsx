import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { PROFILE, renderWithClient } from './account-test-kit';
import { AccountPage } from './AccountPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

beforeEach(() => {
  apiFetch.mockReset();
});

describe('AccountPage «حسابي» (R-ACC-01)', () => {
  it('Arabic: the one h1, who is signed in, the role, the hint and the five sections', async () => {
    apiFetch.mockResolvedValue(PROFILE);
    renderWithClient(<AccountPage />);
    expect(screen.getByRole('heading', { level: 1, name: t.account.title })).toBeTruthy();
    expect(await screen.findByText(t.account.role.replace('{role}', 'معلمة القرآن'))).toBeTruthy();
    expect(screen.getByText(t.account.adminManagedHint)).toBeTruthy();
    const A = t.account;
    for (const title of [A.avatar.title, A.name.title, A.phone.title, A.email.title, A.password.title]) {
      expect(screen.getByRole('region', { name: title })).toBeTruthy();
    }
    expect(screen.getAllByText(PROFILE.email ?? '')[0]?.getAttribute('dir')).toBe('ltr');
    expect(apiFetch).toHaveBeenCalledWith('/me/profile');
  });

  it('no photo: the initials stand in, named for the user', async () => {
    apiFetch.mockResolvedValue(PROFILE);
    renderWithClient(<AccountPage />);
    const avatar = await screen.findByRole('img', { name: t.account.avatar.alt.replace('{name}', PROFILE.full_name) });
    expect(avatar.textContent).toBe('سأ');
  });

  it('loading: a skeleton spoken as «جاري تحميل…»', () => {
    apiFetch.mockReturnValue(new Promise(() => undefined));
    renderWithClient(<AccountPage />);
    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText(t.account.loading)).toBeTruthy();
  });

  it('error: the message and «إعادة المحاولة», which loads again', async () => {
    // profileQuery retries once (1s) before it shows the error.
    const offline = () => Promise.reject(new Error('offline'));
    apiFetch.mockImplementationOnce(offline).mockImplementationOnce(offline).mockResolvedValue(PROFILE);
    renderWithClient(<AccountPage />);
    expect(await screen.findByText(t.account.loadError)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.account.retry }));
    expect(await screen.findByRole('region', { name: t.account.name.title })).toBeTruthy();
    expect(screen.queryByText(t.account.loadError)).toBeNull();
  });
});
