import { SETTING_DEFAULTS, type AcademySettings } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGateSwitch } from './gate-api';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const NEXT: AcademySettings = { ...SETTING_DEFAULTS, crm_cutover_done: true };

function setup(onSaved?: () => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useGateSwitch({ onSaved }), { wrapper });
  return { client, result };
}

afterEach(() => apiSend.mockReset());

describe('useGateSwitch', () => {
  it('one PUT, the answer into [settings], then onSaved', async () => {
    apiSend.mockResolvedValue(NEXT);
    const onSaved = vi.fn();
    const { client, result } = setup(onSaved);
    act(() => result.current.mutate({ cutover: true }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiSend).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(['settings'])).toEqual(NEXT);
    expect(onSaved).toHaveBeenCalledWith(NEXT);
  });

  it('a refused switch (e.g. 428) leaves the cache alone and skips onSaved', async () => {
    apiSend.mockRejectedValue(new Error('428'));
    const onSaved = vi.fn();
    const { client, result } = setup(onSaved);
    act(() => result.current.mutate({ sending: true }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData(['settings'])).toBeUndefined();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
