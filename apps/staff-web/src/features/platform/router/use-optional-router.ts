import { useRouter, type AnyRouter } from '@tanstack/react-router';

/**
 * The router, or null when none is mounted (component tests). With `warn: false` the
 * library's own type still claims a router, so the honest type is declared here.
 */
export function useOptionalRouter(): AnyRouter | null {
  return useRouter({ warn: false });
}
