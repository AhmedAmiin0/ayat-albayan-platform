import { useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, type ReactNode } from 'react';

const KEYFRAMES: Keyframe[] = [
  { opacity: 0, transform: 'translateY(6px)' },
  { opacity: 1, transform: 'none' },
];
const TIMING: KeyframeAnimationOptions = { duration: 200, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' };

/** True when the viewer asked for less motion (or the browser cannot say). */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Fades the page content up on every navigation (owner, 2026-10-05: "add animations"). It replays
 * a Web Animation instead of re-keying, so the route below keeps its state, focus and scroll.
 * No motion under `prefers-reduced-motion: reduce`, and nothing where `Element.animate` is missing.
 */
export function RouteFade({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.resolvedLocation?.pathname });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== 'function' || prefersReducedMotion()) return;
    el.animate(KEYFRAMES, TIMING);
  }, [pathname]);
  return (
    // A growing flex column: a screen may give one box the rest of the frame (`flex-1 min-h-0`).
    <div ref={ref} data-route-fade className="flex min-w-0 flex-1 flex-col">
      {children}
    </div>
  );
}
