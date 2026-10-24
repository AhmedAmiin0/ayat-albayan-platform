import { afterEach, describe, expect, it } from 'vitest';
import { bearer, closeAll, post, startStub } from './test-server.ts';

// docs/19 «crm driver»: the academy CRM's REST API under /crm/api/v1 — Bearer key, {data} / {error} envelope.

afterEach(closeAll);

const BASE = '/crm/api/v1';
const KEY = bearer('fake-crm-key');
const template = { to: '+966500000001', type: 'template', template: { name: 'lesson_reminder_v2', language: 'ar', params: { body: ['a', 'b'] } } };

describe('wa-stub: the crm prefix', () => {
  it('GET /me answers the key scopes; POST /messages records the send with its wamid', async () => {
    const { url, stub } = await startStub({ crm: { apiKey: 'fake-crm-key' } });
    const me = await fetch(`${url}${BASE}/me`, { headers: KEY });
    expect(await me.json()).toEqual({ data: expect.objectContaining({ key: expect.objectContaining({ scopes: ['messages:send'] }) }) });
    const res = await post(`${url}${BASE}/messages`, template, KEY);
    expect(res.status).toBe(201);
    const { data } = (await res.json()) as { data: { whatsapp_message_id: string } };
    expect(stub.sent).toEqual([expect.objectContaining({ id: data.whatsapp_message_id, to: '966500000001', template: 'lesson_reminder_v2', via: 'crm' })]);
    expect(stub.state.requests.map((r) => [r.via, r.path, r.auth])).toEqual([['crm', '/me', 'bearer'], ['crm', '/messages', 'bearer']]);
  });

  it('401 without the key or with a wrong one, 403 without messages:send, 400 on a bad body; nothing sent', async () => {
    const { url, stub } = await startStub({ crm: { apiKey: 'fake-crm-key', scopes: [] } });
    expect((await post(`${url}${BASE}/messages`, template, {})).status).toBe(401);
    expect((await post(`${url}${BASE}/messages`, template, bearer('other'))).status).toBe(401);
    const forbidden = await post(`${url}${BASE}/messages`, template, KEY);
    expect([forbidden.status, await forbidden.json()]).toEqual([403, { error: expect.objectContaining({ code: 'forbidden' }) }]);
    const open = await startStub({});
    expect((await post(`${open.url}${BASE}/messages`, { ...template, to: '0500' }, KEY)).status).toBe(400);
    expect([...stub.sent, ...open.stub.sent]).toHaveLength(0);
  });
});
