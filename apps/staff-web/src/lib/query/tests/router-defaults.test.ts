import { describe, expect, it } from 'vitest';
import { ROUTER_DEFAULTS } from '@/lib/query';

describe('router defaults', () => {
  it('preloads on intent and leaves freshness to TanStack Query', () => {
    expect(ROUTER_DEFAULTS).toEqual({ defaultPreload: 'intent', defaultPreloadStaleTime: 0 });
  });
});
