import { ApiError, createAuthExit } from '@ab/client-core';
import { reportWebError } from '@ab/web-kit';

// A 4xx is the API's answer (validation, permission, not found) and each screen shows it; only
// a 5xx or a read with no answer is a fault worth tracking.
const isAnswer = (error: unknown): boolean => error instanceof ApiError && error.status < 500;

/**
 * The query and mutation caches' onError: an ended session or a disabled account leaves through
 * `leave` (sign out, then the sign-in page); an unexpected failure goes to the error tracker.
 */
export function queryErrorHandler(leave: () => Promise<unknown>): (error: unknown) => void {
  const exit = createAuthExit({ signOut: leave });
  return (error) => {
    exit(error);
    if (!isAnswer(error)) reportWebError(error);
  };
}
