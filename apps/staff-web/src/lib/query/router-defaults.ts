/**
 * Hovering a link starts its route's reads. TanStack Query owns the cache and its staleTime, so
 * the router keeps no preload cache of its own.
 */
export const ROUTER_DEFAULTS = { defaultPreload: 'intent', defaultPreloadStaleTime: 0 } as const;
