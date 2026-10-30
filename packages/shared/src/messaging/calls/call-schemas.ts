import { z } from 'zod';
import { phoneE164 } from '../../core/schemas/common.js';

// Request bodies of the calls routes (docs/28 §4). camelCase, like every other request.

/** An SDP offer or answer is a few KB; anything bigger is not one (the column's check too). */
export const CALL_SDP_MAX = 20_000;

const sdp = z.string().min(1).max(CALL_SDP_MAX).refine((v) => v.startsWith('v=0'), 'not_sdp');

/** POST /calls: the browser's (or phone's) SDP offer to the family's WhatsApp. */
export const startCallSchema = z.object({
  phone: phoneE164,
  sdp,
  /** Idempotency (rule 8): a repeated tap returns the first call, never a second (billed) connect. */
  clientRequestId: z.uuid(),
});
export type StartCallInput = z.input<typeof startCallSchema>;

/** POST /calls/:id/accept: the answering device's SDP answer to the family's offer. */
export const acceptCallSchema = z.object({ sdp });
export type AcceptCallInput = z.input<typeof acceptCallSchema>;

/** POST /calls/permission/:phone/request: «اطلب إذن الاتصال», a staff send through the outbox. */
export const callPermissionRequestSchema = z.object({ clientRequestId: z.uuid() });

/** GET /calls: the calls log (newest first), optionally one chat's. */
export const callListQuerySchema = z.object({
  phone: phoneE164.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
