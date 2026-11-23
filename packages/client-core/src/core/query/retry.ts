import { ApiError } from '../http/index.js';

const MAX_TRIES = 3;

const isRefusal = (error: unknown): boolean => error instanceof ApiError && error.status < 500;

// A fetch that got no answer rejects with a TypeError; on mobile the reconnect refetches, so a
// retry would only queue a second read behind the first.
const isUnanswered = (error: unknown): boolean => error instanceof TypeError;

/** TanStack `retry`: a 4xx never succeeds on retry; a 5xx or other failure gets three tries. */
export const shouldRetry = (failureCount: number, error: unknown): boolean =>
  !isRefusal(error) && !isUnanswered(error) && failureCount < MAX_TRIES;

/**
 * The web rule: `navigator.onLine` stays true through an API restart or a read deadline, so no
 * reconnect refetch comes; a read with no answer gets the three tries too.
 */
export const shouldRetryUnanswered = (failureCount: number, error: unknown): boolean =>
  !isRefusal(error) && failureCount < MAX_TRIES;
