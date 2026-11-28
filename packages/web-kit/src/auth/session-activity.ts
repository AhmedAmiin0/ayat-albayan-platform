import { activitySessionRoutes } from '@ab/shared';
import { call } from '@ab/web-kit/lib/http/api';
import type { SessionEvent } from './session-activity.types';

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
  const route = activitySessionRoutes[event];
  const report = call({ route, signal: abort.signal }).then(
    () => undefined,
    () => undefined,
  );
  try {
    await Promise.race([report, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
