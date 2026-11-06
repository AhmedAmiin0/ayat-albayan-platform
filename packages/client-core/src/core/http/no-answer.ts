import { ApiError } from './api-error.js';

/**
 * A request that ended WITHOUT an answer (a deadline, a dropped connection, an abort), as opposed
 * to the API's own refusal (an ApiError: 4xx/5xx). The server may still have taken a write that
 * ended this way: a send keeps its clientRequestId and never counts as refused (docs/44 BUG7).
 */
export const isNoAnswer = (error: unknown): boolean => !(error instanceof ApiError);
