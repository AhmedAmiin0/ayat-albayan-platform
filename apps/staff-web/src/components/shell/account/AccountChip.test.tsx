import type { AccountProfile } from '@ab/shared';
import { avatarTone } from '@ab/catalog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { MenuFoot } from './MenuFoot';
import { SideFoot } from './SideFoot';
import { WideHeader } from '@/components/shell/layout/TopBarLayout';
import { mockCall } from '@ab/testing/mock-call';

vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
  useNavigate: () => vi.fn(),
}));
const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

const PROFILE: AccountProfile = {
  id: '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11',
  full_name: 'سارة أحمد',
  email: 'sara@ab.co',
  phone_e164: null,
  avatar_url: 'https://sb.test/avatars/u1.png',
  role: { base: 'teacher', key: 'teacher', name_ar: null, name_en: null },
};

const shown = (ui: ReactElement) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  );
const accountLink = () => screen.getByRole('link', { name: new RegExp(t.account.nav) });

beforeEach(() => {
  mockApi.reset('read');
});

// R-ACC-01: every shell links the account page with the photo or the initials.
describe('«حسابي» in the shells (R-ACC-01)', () => {
  it.each([
    ['SideFoot (admin sidebar ≥ 900px)', <SideFoot key="s" email="sara@ab.co" />],
    ['MenuFoot (the «القائمة» sheet < 900px)', <MenuFoot key="m" email="sara@ab.co" />],
    ['WideHeader (top-bar layouts ≥ 900px)', <WideHeader key="w" />],
  ])('%s links to /account with the photo from GET /me/profile', async (_, ui) => {
    mockApi.onRead(() => PROFILE);
    const { container } = shown(ui);
    expect(accountLink().getAttribute('href')).toBe('/account');
    await vi.waitFor(() =>
      expect(container.querySelector('a[href="/account"] img')?.getAttribute('src')).toBe(
        PROFILE.avatar_url,
      ),
    );
    expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/me/profile' });
  });

  it('no photo: the initials of the full name', async () => {
    mockApi.onRead(() => ({ ...PROFILE, avatar_url: null }));
    shown(<SideFoot email="sara@ab.co" />);
    expect(await screen.findByText('س')).toBeTruthy(); // Arabic: one letter (avatarInitials)
  });

  it("the initials' tone hashes avatar_seed (the linked teacher), so the person keeps one tone", async () => {
    mockApi.onRead(() => ({ ...PROFILE, avatar_url: null, avatar_seed: 't1' }));
    const { container } = shown(<SideFoot email="sara@ab.co" />);
    await screen.findByText('س');
    expect(container.querySelector('[data-avatar-tone]')?.getAttribute('data-avatar-tone')).toBe(
      String(avatarTone('t1') + 1),
    );
  });

  it('the profile fails: the link and the email stay (initial from the email)', async () => {
    mockApi.onRead(() => Promise.reject(new Error('offline')));
    shown(<MenuFoot email="sara@ab.co" />);
    expect(accountLink().getAttribute('href')).toBe('/account');
    expect(screen.getByText('sara@ab.co').getAttribute('dir')).toBe('ltr');
    expect(screen.getByText('S')).toBeTruthy();
  });

  it('is a 44px target', () => {
    mockApi.onRead(() => PROFILE);
    shown(<WideHeader />);
    expect(accountLink().className).toContain('min-h-11');
  });
});
