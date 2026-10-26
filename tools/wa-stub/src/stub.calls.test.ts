import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { closeAll, post, startHook, startStub } from './test-server.ts';

// docs/28: WhatsApp Calling under the kapso prefix (signaling only: no audio) and fake calling webhooks.

afterEach(closeAll);

const KEY = { 'x-api-key': 'fake-kapso-key' };
const CALLS = '/kapso/v24.0/PN-CHAT/calls';

async function setup(callPermission?: boolean) {
  const hook = await startHook();
  const kapso = { apiKey: 'fake-kapso-key', webhookUrl: hook.url, webhookSecret: 'fake-kapso-secret', ...(callPermission === undefined ? {} : { callPermission }) };
  const { url, stub } = await startStub({ phoneNumberId: 'PN-CHAT', enforceWindow: false, kapso });
  return { hook, url, stub };
}

describe('wa-stub: calls', () => {
  it('connect answers a wacid; every action is logged; an unknown action is 400', async () => {
    const { url, stub } = await setup();
    const res = await post(`${url}${CALLS}`, { messaging_product: 'whatsapp', to: '201001234567', action: 'connect', session: { sdp_type: 'offer', sdp: 'v=0' }, biz_opaque_callback_data: 'ref-1' }, KEY);
    const id = ((await res.json()) as { calls: { id: string }[] }).calls[0]?.id ?? '';
    expect(id).toMatch(/^wacid\.stub-/);
    expect((await post(`${url}${CALLS}`, { call_id: id, action: 'terminate' }, KEY)).status).toBe(200);
    expect((await post(`${url}${CALLS}`, { call_id: id, action: 'dance' }, KEY)).status).toBe(400);
    expect(stub.state.calls).toMatchObject([{ action: 'connect', ref: 'ref-1', to: '201001234567' }, { action: 'terminate', callId: id }]);
    expect((await post(`${url}${CALLS}`, { action: 'connect' }, {})).status).toBe(401);
  });

  it('call_permissions: granted by default, or none yet with a request allowed', async () => {
    const granted = await setup();
    const a = (await (await fetch(`${granted.url}/kapso/v24.0/PN-CHAT/call_permissions?user_wa_id=1`, { headers: KEY })).json()) as { actions: { action_name: string; can_perform_action: boolean }[] };
    expect(a.actions.find((x) => x.action_name === 'start_call')?.can_perform_action).toBe(true);
    const none = await setup(false);
    const b = (await (await fetch(`${none.url}/kapso/v24.0/PN-CHAT/call_permissions?user_wa_id=1`, { headers: KEY })).json()) as typeof a;
    expect(b.actions.map((x) => x.can_perform_action)).toEqual([false, true]);
  });

  it('POST /__stub/kapso/call forwards a Kapso-signed `calls` change (an inbound offer)', async () => {
    const { url, hook } = await setup();
    const res = await post(`${url}/__stub/kapso/call`, { event: 'connect', callId: 'wacid.IN', peer: '201001234567', sdp: 'v=0 offer' }, {});
    expect(res.status).toBe(200);
    const got = hook.received[0];
    const body = JSON.parse(got?.body ?? '{}') as { entry: { changes: { field: string; value: { calls: { session: { sdp_type: string } }[] } }[] }[] };
    expect(body.entry[0]?.changes[0]?.field).toBe('calls');
    expect(body.entry[0]?.changes[0]?.value.calls[0]?.session.sdp_type).toBe('offer');
    expect(got?.kapsoSig).toBe(createHmac('sha256', 'fake-kapso-secret').update(got?.body ?? '').digest('hex'));
  });
});
