// The reader's «less motion» wish, read once per use (no subscription: callers ask at the moment
// they move something). No matchMedia (jsdom, old browsers): as if not asked.

const QUERY = '(prefers-reduced-motion: reduce)';

/** The reader asked for less motion. */
export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia(QUERY).matches;

/** A scroll that glides, unless the reader asked for less motion (then it jumps). */
export const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');
