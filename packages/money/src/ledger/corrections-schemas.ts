import { z } from 'zod';

// Corrections of money already recorded: a wrong transfer is voided with a reason, never deleted,
// so the history keeps it (struck through) and the audit log says why.

/** POST /teacher-earnings/payments/:id/void, POST /payouts/:id/unpay. */
export const voidReasonSchema = z.object({ reason: z.string().trim().min(3, 'reason_required').max(500) });

export type VoidReason = z.output<typeof voidReasonSchema>;
