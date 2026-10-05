import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Can } from './Can';
import { meQuery, type Me } from './me';
import { usePermissions } from './usePermissions';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: {} } }) } } }));

const me = (permissions: string[]): Me => ({
  id: 'u', email: null, role: 'admin', fullName: 'منى', locale: 'ar', tz: 'Asia/Riyadh', roleKey: 'clerk', permissions,
});

let client = new QueryClient();
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe('usePermissions', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it('is empty and loading before /auth/me answers', () => {
    apiFetch.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => usePermissions(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.can('leads.view')).toBe(false);
  });

  it('answers from the server-resolved list', async () => {
    apiFetch.mockResolvedValue(me(['students.manage']));
    const { result } = renderHook(() => usePermissions(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.can('students.view')).toBe(true);
    expect(result.current.can('payments.view')).toBe(false);
    expect(result.current.canAny(['payments.view', 'students.manage'])).toBe(true);
    expect(meQuery.queryKey).toEqual(['auth', 'me']);
  });

  it('the wildcard grants everything', async () => {
    apiFetch.mockResolvedValue(me(['*']));
    const { result } = renderHook(() => usePermissions(), { wrapper });
    await waitFor(() => expect(result.current.can('roles.manage')).toBe(true));
  });
});

describe('<Can>', () => {
  beforeEach(() => {
    apiFetch.mockResolvedValue(me(['leads.view']));
  });

  it('shows children when allowed and the fallback when not', async () => {
    render(
      <>
        <Can permission="leads.view"><b>yes</b></Can>
        <Can permission="leads.manage" fallback={<i>no</i>}><b>hidden</b></Can>
      </>,
      { wrapper },
    );
    await waitFor(() => expect(screen.getByText('yes')).toBeTruthy());
    expect(screen.getByText('no')).toBeTruthy();
    expect(screen.queryByText('hidden')).toBeNull();
  });

  it('needs every permission unless `any`', async () => {
    render(
      <>
        <Can permission={['leads.view', 'inbox.view']}><b>both</b></Can>
        <Can permission={['leads.view', 'inbox.view']} any><b>one</b></Can>
      </>,
      { wrapper },
    );
    await waitFor(() => expect(screen.getByText('one')).toBeTruthy());
    expect(screen.queryByText('both')).toBeNull();
  });
});
