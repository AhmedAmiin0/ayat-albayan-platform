import { z } from 'zod';
import { waTo, type GraphBody } from './wa-components';

// docs/28 §3.1: a session message (24 h window); interactive_payload tells the dispatcher.

export const CALL_PERMISSION_PAYLOAD = { type: 'call_permission_request' } as const;

const markerSchema = z.object({ type: z.literal(CALL_PERMISSION_PAYLOAD.type) });

/** Is this outbound row a call-permission request (its interactive_payload marker)? */
export function isCallPermissionRequest(payload: unknown): boolean {
  return markerSchema.safeParse(payload).success;
}

export function callPermissionMessage(input: { to: string; text: string }): GraphBody {
  return {
    ...{ messaging_product: 'whatsapp', recipient_type: 'individual', to: waTo(input.to) },
    type: 'interactive',
    interactive: { type: 'call_permission_request', action: { name: 'call_permission_request' }, body: { text: input.text } },
  };
}
