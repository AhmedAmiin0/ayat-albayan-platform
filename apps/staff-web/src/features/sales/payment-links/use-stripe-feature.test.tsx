import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@ab/web-kit';
import { useStripeFeature } from './use-stripe-feature';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

function run() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useStripeFeature(), { wrapper });
}

describe('useStripeFeature: the test build AND the API (docs/30)', () => {
  afterEach(() => {
    mockApi.reset('read');
    vi.unstubAllEnvs();
  });

  it('a normal build: off, and GET /stripe/feature is never asked', async () => {
    mockApi.onRead(() => ({ stripe: true }));
    const { result } = run();
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current).toBe(false);
    expect(mockApi.reads()).toHaveLength(0);
  });

  it('the test build with the API on: on', async () => {
    vi.stubEnv('VITE_FEATURE_STRIPE', '1');
    mockApi.onRead(() => ({ stripe: true }));
    const { result } = run();
    await waitFor(() => expect(result.current).toBe(true));
    expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/stripe/feature' });
  });

  it('the test build, but the API says no or has no Stripe (404): off', async () => {
    vi.stubEnv('VITE_FEATURE_STRIPE', '1');
    mockApi.onRead(() => ({ stripe: false }));
    const off = run();
    await waitFor(() => expect(mockApi.reads()).not.toHaveLength(0));
    expect(off.result.current).toBe(false);
    mockApi.onRead(() => Promise.reject(new ApiError(404, { code: 'not_found' })));
    const missing = run();
    await waitFor(() => expect(mockApi.reads()).toHaveLength(2));
    expect(missing.result.current).toBe(false);
  });

  it('only the exact flag "1" is the test build', async () => {
    vi.stubEnv('VITE_FEATURE_STRIPE', 'true');
    run();
    await new Promise((r) => setTimeout(r, 20));
    expect(mockApi.reads()).toHaveLength(0);
  });
});
