import { afterEach, describe, expect, it } from 'vitest';
import { closeAll, post, startStub } from './test-server.ts';

afterEach(closeAll);

const KEY = { 'x-api-key': 'k' };
const CALLS = '/kapso/v24.0/PN-X/calls';
const invalid = (details: string) => ({
  error: expect.objectContaining({
    code: 100,
    message: '(#100) Invalid parameter',
    error_data: { messaging_product: 'whatsapp', details },
  }),
});

async function answer(res: Response) {
  return [res.status, await res.json()];
}

describe('wa-stub: call actions', () => {
  it('an unknown or missing action is refused before the call id; nothing is logged', async () => {
    const { url, stub } = await startStub({ kapso: { apiKey: 'k' } });
    const send = async (body: unknown) => answer(await post(`${url}${CALLS}`, body, KEY));
    expect(await send({ call_id: 'c1' })).toEqual([400, invalid('action')]);
    expect(await send({ action: 'dance', call_id: 'c1' })).toEqual([400, invalid('action')]);
    expect(await send({ action: 'accept' })).toEqual([400, invalid('call_id is required')]);
    expect(stub.state.calls).toEqual([]);
  });

  it('a non-connect action answers success and logs the path number, its id and nulls', async () => {
    const { url, stub } = await startStub({ kapso: { apiKey: 'k' } });
    const res = await post(`${url}${CALLS}`, { action: 'reject', call_id: 'wacid.1' }, KEY);
    expect(await answer(res)).toEqual([200, { messaging_product: 'whatsapp', success: true }]);
    expect(stub.state.calls).toEqual([
      { phoneNumberId: 'PN-X', action: 'reject', callId: 'wacid.1', to: null, ref: null },
    ]);
  });

  it('connect ignores a given call id and answers a fresh wacid', async () => {
    const { url, stub } = await startStub({ kapso: { apiKey: 'k' } });
    const res = await post(`${url}${CALLS}`, { action: 'connect', call_id: 'mine', to: '20' }, KEY);
    const callId = stub.state.calls[0]?.callId;
    expect(callId).toMatch(/^wacid\.stub-/);
    expect(await answer(res)).toEqual([
      200,
      { messaging_product: 'whatsapp', calls: [{ id: callId }] },
    ]);
    expect(stub.state.calls[0]).toMatchObject({ action: 'connect', to: '20', ref: null });
  });
});
