import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNarrow } from './use-narrow';

describe('useNarrow', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('false without matchMedia (jsdom, SSR): the wide layout', () => {
    expect(renderHook(() => useNarrow()).result.current).toBe(false);
  });

  it('follows the (max-width: 47.99rem) query', () => {
    const query = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.stubGlobal('matchMedia', vi.fn(() => query));
    expect(renderHook(() => useNarrow()).result.current).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(max-width: 47.99rem)');
  });
});
