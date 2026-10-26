import { describe, expect, it } from 'vitest';
import { WaError } from '../../whatsapp/whatsapp.types';
import { ADMIN_ACTOR, FAMILY, SALES_ACTOR, fakeGate, fakeKit, teacherActor } from '../calls.fakes';
import { CallReads } from './call-reads.service';
import { InboundCalls } from './inbound.service';

async function ringing() {
  const t = fakeKit();
  const row = await t.queries.insert({ direction: 'inbound', status: 'ringing', phone_e164: FAMILY, wa_call_id: 'wacid.IN', offer_sdp: 'v=0 offer' });
  if (!row) throw new Error('no row');
  return { ...t, id: row.id, calls: new InboundCalls(t.kit, fakeGate()), reads: new CallReads(t.kit, fakeGate()) };
}

describe('InboundCalls: the first accept wins, the others stop ringing', () => {
  it('every allowed staff member sees it ring, with the offer', async () => {
    const { reads } = await ringing();
    expect(await reads.active(ADMIN_ACTOR)).toMatchObject([{ status: 'ringing', offer_sdp: 'v=0 offer' }]);
    expect(await reads.active(SALES_ACTOR)).toHaveLength(1);
    expect(await reads.active(teacherActor([]))).toHaveLength(0);
    expect(await reads.active(teacherActor([FAMILY]))).toHaveLength(1);
  });

  it('accept: pre_accept + accept once, the row active and taken by the first; the second gets 409', async () => {
    const { calls, reads, api, id, queries } = await ringing();
    const view = await calls.accept(ADMIN_ACTOR, { id, sdp: 'v=0 answer' });
    expect(view).toMatchObject({ status: 'active', staff_id: ADMIN_ACTOR.user.id });
    expect(api.accept).toHaveBeenCalledTimes(1);
    expect(api.accept).toHaveBeenCalledWith(expect.anything(), { waCallId: 'wacid.IN', sdp: 'v=0 answer', ref: id });
    await expect(calls.accept(SALES_ACTOR, { id, sdp: 'v=0 b' })).rejects.toMatchObject({ response: { code: 'already_taken' } });
    expect(await reads.active(SALES_ACTOR)).toHaveLength(0);
    expect(queries.rows.get(id)?.accepted_by).toBe(ADMIN_ACTOR.user.id);
  });

  it('a failed accept ends the call failed (502), never retried', async () => {
    const { calls, api, id, queries } = await ringing();
    api.accept.mockRejectedValue(new WaError('x', { code: 131042, status: 400 }));
    await expect(calls.accept(ADMIN_ACTOR, { id, sdp: 'v=0 answer' })).rejects.toMatchObject({ status: 502, response: { reason: 'meta_131042' } });
    expect(api.accept).toHaveBeenCalledTimes(1);
    expect(queries.rows.get(id)).toMatchObject({ status: 'ended', end_reason: 'failed' });
  });

  it('reject: WhatsApp reject, the row declined; a teacher outside the chat gets 404', async () => {
    const { calls, api, id } = await ringing();
    await expect(calls.reject(teacherActor([]), id)).rejects.toMatchObject({ status: 404 });
    await expect(calls.reject(ADMIN_ACTOR, id)).resolves.toMatchObject({ status: 'ended', end_reason: 'declined' });
    expect(api.reject).toHaveBeenCalledWith(expect.anything(), 'wacid.IN');
    await expect(calls.accept(ADMIN_ACTOR, { id, sdp: 'v=0 a' })).rejects.toMatchObject({ response: { code: 'call_ended' } });
  });
});

describe('CallReads', () => {
  it('the log lists newest first, narrowed to a teacher\'s families; SDPs never in it', async () => {
    const { reads, queries } = await ringing();
    await queries.insert({ direction: 'outbound', status: 'ended', end_reason: 'completed', phone_e164: '+201005555555', started_at: '2026-10-27T00:00:00Z' });
    const all = await reads.list(ADMIN_ACTOR, { limit: 10 });
    expect(all.map((c) => c.phone_e164)).toEqual(['+201005555555', FAMILY]);
    expect(all[0]).not.toHaveProperty('offer_sdp');
    expect(await reads.list(teacherActor([FAMILY]), { limit: 10 })).toHaveLength(1);
    expect(await reads.list(teacherActor([FAMILY]), { phone: '+201005555555', limit: 10 })).toEqual([]);
  });

  it('off: active and list answer 404', async () => {
    const t = fakeKit();
    const reads = new CallReads(t.kit, fakeGate({ on: false }));
    await expect(reads.active(ADMIN_ACTOR)).rejects.toMatchObject({ status: 404 });
    await expect(reads.list(ADMIN_ACTOR, { limit: 5 })).rejects.toMatchObject({ status: 404 });
  });
});
