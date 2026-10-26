import { waTo, type GraphBody } from './wa-components';

// «اطلب إذن الاتصال» (docs/28 §3.1): an interactive call_permission_request, a session message (24 h
// window only). Queued like any staff send; messages.interactive_payload marks the row so the
// dispatcher builds this body instead of a plain text (the row's body is the request's text).

export const CALL_PERMISSION_PAYLOAD = { type: 'call_permission_request' } as const;

/** Is this outbound row a call-permission request (its interactive_payload marker)? */
export function isCallPermissionRequest(payload: unknown): boolean {
  return typeof payload === 'object' && payload !== null && (payload as { type?: unknown }).type === CALL_PERMISSION_PAYLOAD.type;
}

export function callPermissionMessage(input: { to: string; text: string }): GraphBody {
  return {
    ...{ messaging_product: 'whatsapp', recipient_type: 'individual', to: waTo(input.to) },
    type: 'interactive',
    interactive: { type: 'call_permission_request', action: { name: 'call_permission_request' }, body: { text: input.text } },
  };
}
