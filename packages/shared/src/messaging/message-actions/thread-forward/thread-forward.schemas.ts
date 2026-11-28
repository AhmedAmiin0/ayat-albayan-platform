import { clientRequestId, E164_RE } from '@ab/core';
import { z } from 'zod';
import { FORWARD_MAX_TARGETS } from '../../replies/reply-forward';

/** POST /threads/forward: one message copied to 1-5 other chats; the id makes a retry one send. */
export const threadForwardSchema = z.object({
  messageId: z.uuid(),
  targets: z
    .array(z.string().regex(E164_RE))
    .min(1)
    .max(FORWARD_MAX_TARGETS)
    .refine((t) => new Set(t).size === t.length, { message: 'duplicate_target' }),
  clientRequestId,
});
export type ThreadForward = z.infer<typeof threadForwardSchema>;

/** Why a forward target got nothing: the send path's own error codes. */
export const FORWARD_SKIPS = [
  'session_closed',
  'not_your_thread',
  'own_thread_read_only',
  'line_not_configured',
  'files_forbidden',
  'send_failed',
] as const;
export const forwardSkipSchema = z.enum(FORWARD_SKIPS);
export type ForwardSkip = z.infer<typeof forwardSkipSchema>;

/** One target of a forward: the copy queued (its message id), or skipped and why. */
export const forwardResultSchema = z.discriminatedUnion('sent', [
  z.object({ phone: z.string(), sent: z.literal(true), message_id: z.string() }),
  z.object({ phone: z.string(), sent: z.literal(false), reason: forwardSkipSchema }),
]);
export type ForwardResult = z.infer<typeof forwardResultSchema>;

/** The answer, in the order of the request's targets. */
export const forwardResponseSchema = z.object({ results: z.array(forwardResultSchema) });
export type ForwardResponse = z.infer<typeof forwardResponseSchema>;
