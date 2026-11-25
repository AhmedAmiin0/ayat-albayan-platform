import { afterEach, describe, expect, it } from 'vitest';
import { closeAll, errorCode, post, startStub, templateBody } from './test-server.ts';

afterEach(closeAll);

const OBJ = { nested: true };
const MSG = '/v21.0/PHONE_ID/messages';
const CALLS = '/kapso/v24.0/PN-X/calls';
const KEY = { 'x-api-key': 'k' };

describe('wa-stub: request fields that are not text', () => {
  it('records a read whose message id is an object as an empty id', async () => {
    const { url, stub } = await startStub();
    await post(`${url}${MSG}`, { messaging_product: 'whatsapp', status: 'read', message_id: OBJ });
    expect(stub.state.reads).toEqual(['']);
  });

  it('logs a send whose type is an object as text', async () => {
    const { url, stub } = await startStub({ enforceWindow: false });
    const res = await post(`${url}${MSG}`, { to: '966598917071', type: OBJ });
    expect(res.status).toBe(200);
    expect(stub.sent[0]?.type).toBe('text');
  });

  it('refuses a call action whose call id is an object', async () => {
    const { url, stub } = await startStub({ kapso: { apiKey: 'k' } });
    const res = await post(`${url}${CALLS}`, { action: 'accept', call_id: OBJ }, KEY);
    expect(res.status).toBe(400);
    expect(stub.state.calls).toEqual([]);
  });

  it('arms a failure whose title is an object with the default title', async () => {
    const { url } = await startStub();
    await post(`${url}/__stub/fail`, { to: '+966598917071', code: 131026, title: OBJ });
    const failed = await post(`${url}${MSG}`, templateBody('lesson_reminder_v2', 2));
    expect(await errorCode(failed.clone())).toBe(131026);
    expect(JSON.stringify(await failed.json())).toContain('Simulated failure');
  });
});
