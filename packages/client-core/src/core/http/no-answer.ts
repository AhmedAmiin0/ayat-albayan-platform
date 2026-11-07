import { ApiError } from './api-error.js';

/**
 * A request that ended WITHOUT an answer we can trust (a deadline, a dropped connection, an abort,
 * or a 5xx: a 502/504 from the load balancer, a 500 after the outbox commit), as opposed to the
 * API's own refusal (a 4xx). The server may still have taken a write that ended this way: a send
 * keeps its clientRequestId and never counts as refused (docs/44 BUG7).
 */
export const isNoAnswer = (error: unknown): boolean =>
  !(error instanceof ApiError) || error.status >= 500;
