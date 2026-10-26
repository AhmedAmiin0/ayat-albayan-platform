import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { meQuery } from './me';
import { usePermissions } from './use-permissions';

vi.mock('@/lib/http/supabase', () => ({ supabase: { auth: { getSession: () => new Promise(() => undefined) } } }));

function render(seed?: unknown) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (seed !== undefined) client.setQueryData(meQuery.queryKey, seed as never);
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => usePermissions(), { wrapper }).result.current;
}

describe('usePermissions (docs/27 E2, owner D6)', () => {
  it('grants nothing and is not loaded while /auth/me is loading', () => {
    const view = render();
    expect(view.loaded).toBe(false);
    expect(view.can('payments.read')).toBe(false);
  });

  it('signed out (null) holds nothing', () => {
    expect(render(null)).toMatchObject({ loaded: false, permissions: [] });
  });

  it('once /auth/me answered: loaded, and exactly the listed keys', () => {
    const view = render({ id: 'u1', email: null, role: 'admin', permissions: ['payments.read'] });
    expect(view.loaded).toBe(true);
    expect(view.can('payments.read')).toBe(true);
    expect(view.can('pricing.read')).toBe(false);
  });
});
