// WhatsApp Calling through Kapso's Meta proxy (docs/28), for local dev and tests: POST
// /{pn}/calls logs every action (no audio, no Meta) and answers a connect with a stub wacid;
// GET /{pn}/call_permissions answers granted unless opts.kapso.callPermission is false.
// callValue builds the `calls` webhook change.
import { randomUUID } from 'node:crypto';
import type { Json } from './meta.ts';
import { metaError } from './meta.ts';
import { readJson, type Route } from '../state.ts';
import { V } from './graph.ts';

const ACTIONS = ['connect', 'pre_accept', 'accept', 'reject', 'terminate'];

/** connect starts a call, so the stub mints its wacid; every other action names its call. */
const callIdOf = (action: string, body: Json): string =>
  action === 'connect' ? `wacid.stub-${randomUUID()}` : String(body.call_id ?? '');

const answerOf = (action: string, id: string): Json =>
  action === 'connect'
    ? { messaging_product: 'whatsapp', calls: [{ id }] }
    : { messaging_product: 'whatsapp', success: true };

const callLog = (m: RegExpExecArray, body: Json, call: { action: string; id: string }): Json => ({
  phoneNumberId: m[1] ?? '',
  action: call.action,
  callId: call.id,
  to: body.to ?? null,
  ref: body.biz_opaque_callback_data ?? null,
});

const callsRoute: Route = [
  'POST',
  new RegExp(`^${V}/([^/]+)/calls$`),
  async (req, m, s) => {
    const body = await readJson(req);
    const action = String(body.action ?? '');
    if (!ACTIONS.includes(action)) return [400, metaError(100, 'Invalid parameter', 'action')];
    const id = callIdOf(action, body);
    if (!id) return [400, metaError(100, 'Invalid parameter', 'call_id is required')];
    s.calls.push(callLog(m, body, { action, id }));
    return [200, answerOf(action, id)];
  },
];

const permissionRoute: Route = [
  'GET',
  new RegExp(`^${V}/([^/]+)/call_permissions$`),
  (_req, _m, s) => {
    const granted = s.opts.kapso?.callPermission !== false;
    return [
      200,
      {
        messaging_product: 'whatsapp',
        permission: { status: granted ? 'granted' : 'no_permission' },
        actions: [
          { action_name: 'start_call', can_perform_action: granted },
          { action_name: 'send_call_permission_request', can_perform_action: !granted },
        ],
      },
    ];
  },
];

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

interface Side {
  peer: (peer: string) => Json;
  sdpType: string;
}
const INBOUND: Side = { peer: (peer) => ({ from: peer }), sdpType: 'offer' };
const OUTBOUND: Side = { peer: (peer) => ({ to: peer }), sdpType: 'answer' };

/** The family calls us (USER_INITIATED) with an offer; any other direction is our call. */
const sideOf = (direction: string): Side => (direction === 'USER_INITIATED' ? INBOUND : OUTBOUND);

/** The optional parts of a call item, in Meta's key order; each is left out when not given. */
const OPTIONAL: ((spec: CallSpec, side: Side) => Json)[] = [
  (spec, side) => side.peer(spec.peer),
  (spec, side) => (spec.sdp ? { session: { sdp_type: side.sdpType, sdp: spec.sdp } } : {}),
  (spec) => (spec.status ? { status: spec.status } : {}),
  (spec) => (spec.duration === undefined ? {} : { duration: spec.duration }),
  (spec) => (spec.ref ? { biz_opaque_callback_data: spec.ref } : {}),
];

function callPart(spec: CallSpec, timestamp: string): Json {
  const direction = spec.direction ?? 'USER_INITIATED';
  const head: Json = { id: spec.callId, event: spec.event, direction, timestamp };
  const side = sideOf(direction);
  return OPTIONAL.reduce((item, part) => ({ ...item, ...part(spec, side) }), head);
}

export function callValue(spec: CallSpec): Json {
  const timestamp = String(Math.floor(Date.now() / 1000));
  if (spec.event !== 'status')
    return {
      contacts: [{ wa_id: spec.peer, profile: { name: '' } }],
      calls: [callPart(spec, timestamp)],
    };
  const ref = spec.ref ? { biz_opaque_callback_data: spec.ref } : {};
  return {
    statuses: [
      {
        id: spec.callId,
        type: 'call',
        status: spec.status ?? 'RINGING',
        timestamp,
        recipient_id: spec.peer,
        ...ref,
      },
    ],
  };
}
