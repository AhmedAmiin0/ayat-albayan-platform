// WhatsApp Calling through Kapso's Meta proxy (docs/28), for local dev and tests: POST /{pn}/calls logs
// every action (no audio, no Meta) and answers a connect with a stub wacid; GET /{pn}/call_permissions
// answers granted unless opts.kapso.callPermission is false. callValue builds the `calls` webhook change.
import { randomUUID } from 'node:crypto';
import type { Json } from './meta.ts';
import { metaError } from './meta.ts';
import { readJson, type Route } from '../state.ts';
import { V } from './graph.ts';

const ACTIONS = ['connect', 'pre_accept', 'accept', 'reject', 'terminate'];

const callsRoute: Route = ['POST', new RegExp(`^${V}/([^/]+)/calls$`), async (req, m, s) => {
  const body = await readJson(req);
  const action = String(body['action'] ?? '');
  if (!ACTIONS.includes(action)) return [400, metaError(100, 'Invalid parameter', 'action')];
  const id = action === 'connect' ? `wacid.stub-${randomUUID()}` : String(body['call_id'] ?? '');
  if (!id) return [400, metaError(100, 'Invalid parameter', 'call_id is required')];
  s.calls.push({ phoneNumberId: m[1] ?? '', action, callId: id, to: body['to'] ?? null, ref: body['biz_opaque_callback_data'] ?? null });
  return [200, action === 'connect' ? { messaging_product: 'whatsapp', calls: [{ id }] } : { messaging_product: 'whatsapp', success: true }];
}];

const permissionRoute: Route = ['GET', new RegExp(`^${V}/([^/]+)/call_permissions$`), async (_req, _m, s) => {
  const granted = s.opts.kapso?.callPermission !== false;
  return [200, {
    messaging_product: 'whatsapp',
    permission: { status: granted ? 'granted' : 'no_permission' },
    actions: [
      { action_name: 'start_call', can_perform_action: granted },
      { action_name: 'send_call_permission_request', can_perform_action: !granted },
    ],
  }];
}];

export const kapsoCallRoutes: Route[] = [callsRoute, permissionRoute];

/** POST /__stub/kapso/call body: one Calling webhook item. */
export interface CallSpec {
  event: 'connect' | 'terminate' | 'status';
  callId: string;
  /** The family's digits (from of an inbound call, to of ours). */
  peer: string;
  direction?: 'USER_INITIATED' | 'BUSINESS_INITIATED';
  sdp?: string;
  /** biz_opaque_callback_data (our wa_calls.id). */
  ref?: string;
  /** RINGING / ACCEPTED / REJECTED for a status; Completed / Failed for a terminate. */
  status?: string;
  duration?: number;
  phoneNumberId?: string;
}

function callPart(spec: CallSpec, timestamp: string): Json {
  const direction = spec.direction ?? 'USER_INITIATED';
  const inbound = direction === 'USER_INITIATED';
  return {
    ...{ id: spec.callId, event: spec.event, direction, timestamp },
    ...(inbound ? { from: spec.peer } : { to: spec.peer }),
    ...(spec.sdp ? { session: { sdp_type: inbound ? 'offer' : 'answer', sdp: spec.sdp } } : {}),
    ...(spec.status ? { status: spec.status } : {}),
    ...(spec.duration === undefined ? {} : { duration: spec.duration }),
    ...(spec.ref ? { biz_opaque_callback_data: spec.ref } : {}),
  };
}

export function callValue(spec: CallSpec): Json {
  const timestamp = String(Math.floor(Date.now() / 1000));
  if (spec.event !== 'status') return { contacts: [{ wa_id: spec.peer, profile: { name: '' } }], calls: [callPart(spec, timestamp)] };
  const ref = spec.ref ? { biz_opaque_callback_data: spec.ref } : {};
  return { statuses: [{ id: spec.callId, type: 'call', status: spec.status ?? 'RINGING', timestamp, recipient_id: spec.peer, ...ref }] };
}
