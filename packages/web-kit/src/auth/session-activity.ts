import { apiFetch } from '@ab/web-kit/lib/http/api';

/** What the activity log is told about a Supabase sign-in (the API never sees the sign-in itself). */
export type SessionEvent = 'login' | 'logout' | 'login-failed';

/** Longest a report may hold up sign-in / sign-out; after that it is abandoned. */
export const REPORT_TIMEOUT_MS = 1_500;

/** Never throws or waits past REPORT_TIMEOUT_MS; `logout` starts before signOut for the token. */
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
