import type { ForwardResponse, ThreadForward } from '@ab/shared';
import { apiSend } from '@ab/web-kit/lib/http/api';

/**
 * POST /threads/forward: one message copied to 1–5 other chats. The answer is per
 * target, in request order; a retry of the same forward reuses its clientRequestId (rule 8).
 */
export const forwardMessage = (body: ThreadForward) => apiSend<ForwardResponse>('POST', '/threads/forward', body);
