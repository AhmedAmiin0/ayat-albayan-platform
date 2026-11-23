import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion, scrollBehavior } from './reduced-motion';

const media = (matches: boolean) => vi.stubGlobal('matchMedia', vi.fn(() => ({ matches })));

afterEach(() => vi.unstubAllGlobals());

describe('reduced motion', () => {
  it('glides unless the reader asked for less motion', () => {
    media(false);
    expect(prefersReducedMotion()).toBe(false);
    expect(scrollBehavior()).toBe('smooth');
    media(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(scrollBehavior()).toBe('auto');
  });

  it('a browser without matchMedia counts as not asked', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
    expect(scrollBehavior()).toBe('smooth');
  });
});
