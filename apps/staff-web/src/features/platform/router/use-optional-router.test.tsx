import { renderHook } from '@testing-library/react';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useOptionalRouter } from './use-optional-router';

describe('useOptionalRouter', () => {
  it('is null without a mounted router', () => {
    const { result } = renderHook(() => useOptionalRouter());
    expect(result.current).toBeNull();
  });

  it('returns the mounted router', async () => {
    const router = createRouter({
      routeTree: createRootRoute(),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    await router.load();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RouterProvider router={router} defaultComponent={() => children} />
    );
    const { result } = renderHook(() => useOptionalRouter(), { wrapper });
    expect(result.current).toBe(router);
  });
});
