import { useRouter, type AnyRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { oauthReturnNote } from '@/features/platform/google-sync/google-format';

export type OauthNote = NonNullable<ReturnType<typeof oauthReturnNote>>;

/**
 * Back from Google's consent screen the API sends the browser to /admin/settings?google=connected
 * (or ?google=error&reason=…); the hub and «التكاملات» forward that query to «مزامنة Google»
 * (/admin/settings/google, docs/26b §3). The note is read once, then the query leaves the URL
 * (TanStack Router navigate, replace) on the same path; an anchor, if any, stays.
 */
export function useOauthReturn(): { note: OauthNote | null; clear: () => void } {
  const router: AnyRouter | undefined = useRouter({ warn: false });
  const [note, setNote] = useState<OauthNote | null>(() => oauthReturnNote(window.location.search));
  const returned = note !== null;
  useEffect(() => {
    if (!returned) return;
    const { pathname, hash } = window.location;
    const anchor = hash.replace(/^#/, '');
    if (router) void router.navigate({ to: pathname, search: {}, ...(anchor ? { hash: anchor } : {}), replace: true });
    else window.history.replaceState(window.history.state, '', `${pathname}${hash}`);
  }, [returned, router]);
  return { note, clear: () => setNote(null) };
}
