import { threadForwardCalls } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/web-kit';

const forwards = threadForwardCalls({ apiFetch, apiSend });

/**
 * One message copied to 1-5 other chats. The answer is per target, in request order; a retry of
 * the same forward reuses its clientRequestId (rule 8).
 */
export const forwardMessage = forwards.forward;
