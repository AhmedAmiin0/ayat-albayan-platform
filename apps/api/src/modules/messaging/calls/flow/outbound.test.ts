import { describe, expect, it } from 'vitest';
import { WaError } from '../../whatsapp/whatsapp.types';
import { ADMIN_ACTOR, FAMILY, fakeApi, fakeGate, fakeKit, teacherActor } from '../calls.fakes';
import { OutboundCalls } from './outbound.service';

const REQ = '11111111-1111-4111-8111-111111111111';
const input = { phone: FAMILY, sdp: 'v=0 offer', clientRequestId: REQ };

function setup(opts: { on?: boolean; refuse?: string } = {}) {
  const t = fakeKit();
  return { ...t, calls: new OutboundCalls(t.kit, fakeGate(opts)) };
}

describe('OutboundCalls.start (staff → family)', () => {
  it('persists the call BEFORE the Kapso connect, with our id as the callback ref', async () => {
    const { calls, queries, api } = setup();
    api.connect.mockImplementation(async (_line, req: { ref: string }) => {
      queries.order.push('connect');
      expect(queries.rows.get(req.ref)?.status).toBe('connecting');
      return { waCallId: 'wacid.1' };
    });
    const view = await calls.start(ADMIN_ACTOR, input);
    expect(queries.order).toEqual(['insert', 'connect']);
    expect(api.connect).toHaveBeenCalledWith(expect.anything(), { to: FAMILY, sdp: 'v=0 offer', ref: view.id });
    expect(queries.rows.get(view.id)).toMatchObject({ wa_call_id: 'wacid.1', guardian_id: 'g1', created_by: ADMIN_ACTOR.user.id });
    expect(view).toMatchObject({ direction: 'outbound', status: 'connecting', offer_sdp: null });
  });

  it('never retries a failed or timed-out connect: one request, the row ends failed, 502', async () => {
    const { calls, queries, api } = setup();
    api.connect.mockRejectedValue(new WaError('timeout', { code: null, status: 0, uncertain: true }));
    await expect(calls.start(ADMIN_ACTOR, input)).rejects.toMatchObject({ status: 502, response: { code: 'call_failed', reason: 'uncertain' } });
    expect(api.connect).toHaveBeenCalledTimes(1);
    const [row] = [...queries.rows.values()];
    expect(row).toMatchObject({ status: 'ended', end_reason: 'failed', error_code: 'uncertain' });
  });

  it('a repeated request id returns the first call and connects once', async () => {
    const { calls, api } = setup();
    const first = await calls.start(ADMIN_ACTOR, input);
    const again = await calls.start(ADMIN_ACTOR, input);
    expect(again.id).toBe(first.id);
    expect(api.connect).toHaveBeenCalledTimes(1);
  });

  it('refuses a second live call of the same staff member (409 call_busy)', async () => {
    const { calls } = setup();
    await calls.start(ADMIN_ACTOR, input);
    await expect(calls.start(ADMIN_ACTOR, { ...input, clientRequestId: '22222222-2222-4222-8222-222222222222' })).rejects.toMatchObject({
      response: { code: 'call_busy' },
    });
  });

  it('no permission: 409 no_permission, nothing stored, no connect', async () => {
    const api = fakeApi();
    api.permission.mockResolvedValue({ canCall: false, canRequest: true, expiresAt: null });
    const t = fakeKit({ api });
    const calls = new OutboundCalls(t.kit, fakeGate());
    await expect(calls.start(ADMIN_ACTOR, input)).rejects.toMatchObject({ response: { code: 'no_permission' } });
    expect(t.queries.rows.size).toBe(0);
    expect(api.connect).not.toHaveBeenCalled();
  });

  it('setting off: 404 calls_disabled before anything else', async () => {
    const { calls, api } = setup({ on: false });
    await expect(calls.start(ADMIN_ACTOR, input)).rejects.toMatchObject({ status: 404 });
    expect(api.permission).not.toHaveBeenCalled();
  });

  it('the allow-list and the teacher scope guard the number', async () => {
    await expect(setup({ refuse: FAMILY }).calls.start(ADMIN_ACTOR, input)).rejects.toMatchObject({ response: { code: 'recipient_not_allowed' } });
    await expect(setup().calls.start(teacherActor([]), input)).rejects.toMatchObject({ response: { code: 'not_your_thread' } });
    await expect(setup().calls.start(teacherActor([FAMILY]), input)).resolves.toMatchObject({ status: 'connecting' });
  });
});

describe('OutboundCalls.end', () => {
  it('terminates on WhatsApp, then ends the row as cancelled before an answer', async () => {
    const { calls, api, queries } = setup();
    const view = await calls.start(ADMIN_ACTOR, input);
    const ended = await calls.end(ADMIN_ACTOR, view.id);
    expect(api.terminate).toHaveBeenCalledWith(expect.anything(), 'wacid.OUT');
    expect(ended).toMatchObject({ status: 'ended', end_reason: 'cancelled' });
    expect(queries.rows.get(view.id)?.status).toBe('ended');
  });

  it('a terminate error still ends the row; another user gets 404', async () => {
    const { calls, api } = setup();
    const view = await calls.start(ADMIN_ACTOR, input);
    await expect(calls.end(teacherActor([FAMILY]), view.id)).rejects.toMatchObject({ status: 404 });
    api.terminate.mockRejectedValue(new WaError('x', { code: 1, status: 400 }));
    await expect(calls.end(ADMIN_ACTOR, view.id)).resolves.toMatchObject({ status: 'ended' });
  });
});
