import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { useStripeFeature } from './use-stripe-feature';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

function run() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useStripeFeature(), { wrapper });
}

describe('useStripeFeature: the test build AND the API (docs/30)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    vi.unstubAllEnvs();
  });

  it('a normal build: off, and GET /stripe/feature is never asked', async () => {
    apiFetch.mockResolvedValue({ stripe: true });
    const { result } = run();
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current).toBe(false);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('the test build with the API on: on', async () => {
    vi.stubEnv('VITE_FEATURE_STRIPE', '1');
    apiFetch.mockResolvedValue({ stripe: true });
    const { result } = run();
    await waitFor(() => expect(result.current).toBe(true));
    expect(apiFetch).toHaveBeenCalledWith('/stripe/feature');
  });

  it('the test build, but the API says no or has no Stripe (404): off', async () => {
    vi.stubEnv('VITE_FEATURE_STRIPE', '1');
    apiFetch.mockResolvedValue({ stripe: false });
    const off = run();
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(off.result.current).toBe(false);
    apiFetch.mockRejectedValue(new ApiError(404, { code: 'not_found' }));
    const missing = run();
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    expect(missing.result.current).toBe(false);
  });

  it('only the exact flag "1" is the test build', async () => {
    vi.stubEnv('VITE_FEATURE_STRIPE', 'true');
    run();
    await new Promise((r) => setTimeout(r, 20));
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
