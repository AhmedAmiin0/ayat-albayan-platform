import { useNavigate, useSearch } from '@tanstack/react-router';
import { afterSignIn, parseReturnSearch } from './return-to';

/**
 * After sign-in or the first-time setup: go to this page's `?redirect=` (a same-origin path the
 * guard carried, owner 2026-11-14), else to `home`.
 */
export function useLandAfterSignIn(): (home: string) => Promise<void> {
  const navigate = useNavigate();
  const { redirect } = parseReturnSearch(useSearch({ strict: false }));
  return (home) => navigate({ href: afterSignIn(home, redirect) });
}
