import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * A handler whose identity never changes but always runs the latest `fn` (it reads the last render's
 * state). For callbacks handed to memo rows and lists, where a new function each render would redraw
 * every row (owner 2026-10-27, «Avoid rerenders»). Call it from events, never during render.
 */
export function useStableHandler<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const latest = useRef(fn);
  useLayoutEffect(() => {
    latest.current = fn;
  });
  return useCallback((...args: A) => latest.current(...args), []);
}
