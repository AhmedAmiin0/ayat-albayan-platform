import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Me, meQuery } from '@/features/people/auth';
import { usePresenceSelf } from './use-presence-self';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/lib/http/supabase', () => ({ supabase: {} }));
const track = vi.hoisted(() => ({ calls: [] as string[], leaves: 0 }));
vi.mock('@ab/client-core', async (orig) => ({
  ...(await orig<object>()),
  trackSelf: (_client: unknown, id: string) => {
    track.calls.push(id);
    return () => void (track.leaves += 1);
  },
}));

const mount = (me: { id: string } | null) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const seed: Me | null = me && { ...me, email: null, role: 'teacher', permissions: [] };
  client.setQueryData(meQuery.queryKey, seed);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => usePresenceSelf(), { wrapper });
};
const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  act(() => void document.dispatchEvent(new Event('visibilitychange')));
};

describe('usePresenceSelf: track while the tab is visible (docs/33 §1.1)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    Object.assign(track, { calls: [], leaves: 0 });
    setVisibility('visible');
  });

  it('enabled: tracks the user, leaves when hidden, tracks again when shown, leaves on unmount', async () => {
    apiFetch.mockResolvedValue({ enabled: true });
    const hook = mount({ id: 'u1' });
    await waitFor(() => expect(track.calls).toEqual(['u1']));
    expect(apiFetch).toHaveBeenCalledWith('/presence/me');
    setVisibility('hidden');
    expect(track.leaves).toBe(1);
    setVisibility('visible');
    await waitFor(() => expect(track.calls).toEqual(['u1', 'u1']));
    hook.unmount();
    expect(track.leaves).toBe(2);
  });

  it('presence off: never tracks', async () => {
    apiFetch.mockResolvedValue({ enabled: false });
    mount({ id: 'u1' });
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(track.calls).toEqual([]);
  });

  it('signed out: no request, no track', () => {
    mount(null);
    expect(apiFetch).not.toHaveBeenCalled();
    expect(track.calls).toEqual([]);
  });
});
