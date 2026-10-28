import type { AccountProfile } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { MenuFoot } from './MenuFoot';
import { SideFoot } from './SideFoot';
import { WideHeader } from '../layout/TopBarLayout';

vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
  useNavigate: () => vi.fn(),
}));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const PROFILE: AccountProfile = {
  id: 'u1',
  full_name: 'سارة أحمد',
  email: 'sara@ab.co',
  phone_e164: null,
  avatar_url: 'https://sb.test/avatars/u1.png',
  role: { base: 'teacher', key: 'teacher', name_ar: null, name_en: null },
};

const shown = (ui: ReactElement) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const accountLink = () => screen.getByRole('link', { name: new RegExp(t.account.nav) });

beforeEach(() => {
  apiFetch.mockReset();
});

// R-ACC-01: «حسابي» is linked from the user area of every shell, with the photo or the initials.
describe('«حسابي» in the shells (R-ACC-01)', () => {
  it.each([
    ['SideFoot (admin sidebar ≥ 900px)', <SideFoot key="s" email="sara@ab.co" />],
    ['MenuFoot (the «القائمة» sheet < 900px)', <MenuFoot key="m" email="sara@ab.co" />],
    ['WideHeader (top-bar layouts ≥ 900px)', <WideHeader key="w" />],
  ])('%s links to /account with the photo from GET /me/profile', async (_, ui) => {
    apiFetch.mockResolvedValue(PROFILE);
    const { container } = shown(ui);
    expect(accountLink().getAttribute('href')).toBe('/account');
    await vi.waitFor(() => expect(container.querySelector('a[href="/account"] img')?.getAttribute('src')).toBe(PROFILE.avatar_url));
    expect(apiFetch).toHaveBeenCalledWith('/me/profile');
  });

  it('no photo: the initials of the full name', async () => {
    apiFetch.mockResolvedValue({ ...PROFILE, avatar_url: null });
    shown(<SideFoot email="sara@ab.co" />);
    expect(await screen.findByText('س')).toBeTruthy(); // Arabic: one letter (avatarInitials)
  });

  it('the profile fails: the link and the email stay (initial from the email)', async () => {
    apiFetch.mockImplementation(() => Promise.reject(new Error('offline')));
    shown(<MenuFoot email="sara@ab.co" />);
    expect(accountLink().getAttribute('href')).toBe('/account');
    expect(screen.getByText('sara@ab.co').getAttribute('dir')).toBe('ltr');
    expect(screen.getByText('S')).toBeTruthy();
  });

  it('is a 44px target', () => {
    apiFetch.mockResolvedValue(PROFILE);
    shown(<WideHeader />);
    expect(accountLink().className).toContain('min-h-11');
  });
});
