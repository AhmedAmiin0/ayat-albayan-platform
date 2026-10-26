import { apiFetch } from '@/lib/http/api';

/** What the activity log is told about a Supabase sign-in (the API never sees the sign-in itself). */
export type SessionEvent = 'login' | 'logout' | 'login-failed';

/** Longest a report may hold up sign-in / sign-out; after that it is abandoned. */
export const REPORT_TIMEOUT_MS = 1_500;

/**
 * POST /activity/session/<event> for «سجل النشاط». No body: no email, no password. Never throws
 * and never waits longer than REPORT_TIMEOUT_MS: the request is aborted and dropped, so a slow or
 * dead API can never block signing in or out. `logout` must start before signOut (it needs the
 * still-valid token); `login-failed` goes without one.
 */
export async function reportSession(event: SessionEvent): Promise<void> {
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(() => {
      abort.abort();
      resolve();
    }, REPORT_TIMEOUT_MS);
  });
  const report = apiFetch(`/activity/session/${event}`, { method: 'POST', signal: abort.signal }).then(
    () => undefined,
    () => undefined,
  );
  try {
    await Promise.race([report, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
