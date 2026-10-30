import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteFade } from './RouteFade';

let path = '/admin/students';
vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({ select }: { select: (s: { resolvedLocation: { pathname: string } }) => string }) =>
    select({ resolvedLocation: { pathname: path } }),
}));

const animate = vi.fn();
const media = (reduce: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduce && q.includes('reduce') }) as MediaQueryList);

beforeEach(() => {
  path = '/admin/students';
  animate.mockReset();
  Element.prototype.animate = animate as unknown as Element['animate'];
});
afterEach(() => vi.unstubAllGlobals());

describe('RouteFade', () => {
  it('fades the content up on mount and again on each navigation', () => {
    media(false);
    const { rerender } = render(<RouteFade>محتوى</RouteFade>);
    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate.mock.calls[0]?.[1]).toMatchObject({ duration: 200 });
    path = '/admin/schedule';
    rerender(<RouteFade>محتوى</RouteFade>);
    expect(animate).toHaveBeenCalledTimes(2);
  });

  it('does not move under prefers-reduced-motion', () => {
    media(true);
    render(<RouteFade>محتوى</RouteFade>);
    expect(animate).not.toHaveBeenCalled();
  });

  it('keeps the same children mounted across navigations (no re-key)', () => {
    media(false);
    const { container, rerender } = render(<RouteFade><input aria-label="x" /></RouteFade>);
    const input = container.querySelector('input');
    path = '/admin/inbox';
    rerender(<RouteFade><input aria-label="x" /></RouteFade>);
    expect(container.querySelector('input')).toBe(input);
  });
});
