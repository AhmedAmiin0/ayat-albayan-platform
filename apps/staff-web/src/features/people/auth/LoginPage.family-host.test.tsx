import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { LoginPage } from './LoginPage';
import type * as EnvModule from '@ab/web-kit/lib/http/env/env';

vi.mock('@ab/web-kit/lib/http/env/env', async (original) => {
  const real = await original<typeof EnvModule>();
  return { ...real, env: { ...real.env, familyOrigin: 'https://family.example.test' } };
});
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({ navigate: vi.fn() }),
  useSearch: () => ({}),
  Link: ({ children }: { children: unknown }) => children,
}));
vi.mock('./login/StaffPanel', () => ({ StaffPanel: () => <form aria-label="staff" /> }));

describe('/login once the family host is live (docs/51 §3)', () => {
  it('shows the staff form alone and links families to their own sign-in', () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <LoginPage />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.getByRole('form', { name: 'staff' })).toBeTruthy();
    const link = screen.getByRole('link', { name: t.familyWeb.loginLink });
    expect(link.getAttribute('href')).toBe('https://family.example.test/login');
  });
});
