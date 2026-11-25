import { afterEach, describe, expect, it } from 'vitest';
import { bearer, closeAll, post, startStub } from './test-server.ts';

afterEach(closeAll);

const MESSAGES = '/crm/api/v1/messages';
const KEY = bearer('k');
const TO = '+966500000001';

const badRequest = (message: string) => [400, { error: { code: 'bad_request', message } }];

async function answer(res: Response) {
  return [res.status, await res.json()];
}

describe('wa-stub: crm refusals and send kinds', () => {
  it('unknown crm routes are 404 and not logged; a refused call is still logged', async () => {
    const { url, stub } = await startStub({ crm: { apiKey: 'k' } });
    expect((await fetch(`${url}/crm/api/v1/messages`)).status).toBe(404);
    expect((await post(`${url}/crm/api/v1/me`, {}, KEY)).status).toBe(404);
    const me = await fetch(`${url}/crm/api/v1/me`, { headers: { 'x-api-key': 'k' } });
    expect(await answer(me)).toEqual([
      401,
      { error: { code: 'unauthorized', message: 'Missing or invalid API key' } },
    ]);
    expect(stub.state.requests).toEqual([{ via: 'crm', method: 'GET', path: '/me', auth: 'none' }]);
  });

  it('GET /me answers the configured scopes; any bearer passes without a key', async () => {
    const { url } = await startStub({ crm: { scopes: ['contacts:read'] } });
    const me = await fetch(`${url}/crm/api/v1/me`, { headers: bearer('anything') });
    expect(await answer(me)).toEqual([
      200,
      {
        data: {
          account: { id: 'acct-stub', name: 'Stub academy' },
          key: { id: 'key-stub', scopes: ['contacts:read'] },
        },
      },
    ]);
  });

  it('the scope is checked before the body', async () => {
    const { url } = await startStub({ crm: { scopes: [] } });
    const res = await post(`${url}${MESSAGES}`, { to: 'bad' }, KEY);
    expect((await answer(res))[0]).toBe(403);
  });

  it('refuses a bad to, a template without name or language and media without media_url', async () => {
    const { url, stub } = await startStub({});
    const send = async (body: unknown) => answer(await post(`${url}${MESSAGES}`, body, KEY));
    expect(await send({ type: 'text', text: 'x' })).toEqual(badRequest("'to' must be E.164"));
    expect(await send({ to: TO, type: 'template', template: { name: 'a' } })).toEqual(
      badRequest('template name and language are required'),
    );
    expect(await send({ to: TO, type: 'template' })).toEqual(
      badRequest('template name and language are required'),
    );
    expect(await send({ to: TO, type: 'image' })).toEqual(badRequest('media_url is required'));
    expect(stub.sent).toEqual([]);
  });

  it('records text by default, media with its url and a template with its name', async () => {
    const { url, stub } = await startStub({});
    const send = (body: unknown) => post(`${url}${MESSAGES}`, body, KEY);
    const text = await send({ to: TO, text: 'x' });
    expect(await answer(text)).toEqual([
      201,
      {
        data: {
          message_id: expect.any(String),
          whatsapp_message_id: expect.stringMatching(/^wamid\./),
          conversation_id: expect.any(String),
          contact_id: expect.any(String),
          contact_created: false,
        },
      },
    ]);
    await send({ to: TO, type: 'image', media_url: 'https://x/a.jpg' });
    await send({ to: TO, type: 'template', template: { name: 'n', language: 'ar' } });
    expect(stub.sent.map((m) => [m.to, m.type, m.template, m.via])).toEqual([
      ['966500000001', 'text', undefined, 'crm'],
      ['966500000001', 'image', undefined, 'crm'],
      ['966500000001', 'template', 'n', 'crm'],
    ]);
    expect(stub.sent.map((m) => 'template' in m)).toEqual([false, false, true]);
  });
});
