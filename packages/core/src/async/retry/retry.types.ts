/** How `retry` paces its attempts. */
export interface RetryOptions {
  /** The wait before each further attempt, in ms: delays.length + 1 attempts in all. */
  delays: readonly number[];
  sleep: (ms: number) => Promise<void>;
  /** True for an error a retry cannot change: it is rethrown at once. */
  giveUp?: (e: unknown) => boolean;
}
