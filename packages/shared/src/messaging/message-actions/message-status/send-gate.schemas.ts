import { z } from 'zod';

export const SEND_GATE_REASONS = ['not_configured', 'switch_off'] as const;
/** not_configured: no WhatsApp line on the server; switch_off: the admin's sending switch. */
export const sendGateReasonSchema = z.enum(SEND_GATE_REASONS);
export type SendGateReason = z.infer<typeof sendGateReasonSchema>;

/** Can anything go out now (docs/12 §3.1), and if not, which gate is closed. */
export const sendGateViewSchema = z.object({
  open: z.boolean(),
  reason: sendGateReasonSchema.nullable(),
  /** Outbound rows waiting in the queue: they go out the moment the gate opens. */
  queued: z.number().int().nonnegative(),
  /** Set only while sending is limited to a list of recipients. */
  restricted: z.boolean().optional(),
});
export type SendGateView = z.infer<typeof sendGateViewSchema>;
