import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSeenOnce } from './use-seen-once';

// Owner 2026-11-01: a chat PDF asks page 1 only once its card has been on screen (never a burst).
type Fire = (entries: Pick<IntersectionObserverEntry, 'isIntersecting'>[]) => void;
let fire: Fire = () => undefined;
const disconnect = vi.fn();

function Probe() {
  const { ref, seen } = useSeenOnce();
  return <div ref={ref}>{seen ? 'seen' : 'not yet'}</div>;
}

describe('useSeenOnce', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: (entries: unknown[]) => void) {
          fire = (entries) => cb(entries);
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    disconnect.mockReset();
  });

  it('false until the element intersects, then true for good (the observer is let go)', () => {
    render(<Probe />);
    expect(screen.getByText('not yet')).toBeTruthy();
    act(() => fire([{ isIntersecting: false }]));
    expect(screen.getByText('not yet')).toBeTruthy();
    act(() => fire([{ isIntersecting: true }]));
    expect(screen.getByText('seen')).toBeTruthy();
    expect(disconnect).toHaveBeenCalled();
    act(() => fire([{ isIntersecting: false }]));
    expect(screen.getByText('seen')).toBeTruthy();
  });

  it('no IntersectionObserver (an old browser): seen at once', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Probe />);
    expect(screen.getByText('seen')).toBeTruthy();
  });
});
