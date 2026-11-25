import { afterEach, describe, expect, it } from 'vitest';
import { AUTH, closeAll, startStub } from './test-server.ts';

afterEach(closeAll);

const KEY = { 'x-api-key': 'k' };
const opts = { accessToken: 'test-token', kapso: { apiKey: 'k' }, crm: { apiKey: 'c' } };

describe('wa-stub: request routing', () => {
  it('an unknown route is 404 with the method and path, and is not logged', async () => {
    const { url, stub } = await startStub(opts);
    const res = await fetch(`${url}/v21.0/nowhere/at/all`, { method: 'PUT', headers: AUTH });
    expect([res.status, await res.json()]).toEqual([
      404,
      { error: 'no stub route for PUT /v21.0/nowhere/at/all' },
    ]);
    expect(stub.state.requests).toEqual([]);
  });

  it('control routes need no credential and are not logged', async () => {
    const { url, stub } = await startStub(opts);
    expect((await fetch(`${url}/__stub/messages`)).status).toBe(200);
    expect((await fetch(`${url}/__stub/kapso-media/ab`)).status).toBe(404);
    expect(stub.state.requests).toEqual([]);
  });

  it('/__stub/media/ is a Graph download: logged and refused without the bearer', async () => {
    const { url, stub } = await startStub(opts);
    const res = await fetch(`${url}/__stub/media/ab`);
    expect(res.status).toBe(401);
    expect(stub.state.requests).toEqual([
      { via: 'graph', method: 'GET', path: '/__stub/media/ab', auth: 'none' },
    ]);
  });

  it('a Graph path is logged before the bearer is checked; the refusal is code 190', async () => {
    const { url, stub } = await startStub(opts);
    const res = await fetch(`${url}/v21.0/PN/message_templates`, {
      headers: { authorization: 'Bearer wrong' },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: 190 } });
    expect(stub.state.requests).toEqual([
      { via: 'graph', method: 'GET', path: '/v21.0/PN/message_templates', auth: 'bearer' },
    ]);
  });

  it('the kapso prefix logs the Graph path without it and refuses a wrong key', async () => {
    const { url, stub } = await startStub(opts);
    const res = await fetch(`${url}/kapso/v24.0/PN/call_permissions`, {
      headers: { 'x-api-key': 'nope' },
    });
    expect([res.status, await res.json()]).toEqual([
      401,
      {
        error: expect.objectContaining({
          code: 401,
          message: '(#401) Unauthorized: a valid X-API-Key is required',
        }),
      },
    ]);
    const ok = await fetch(`${url}/kapso/v24.0/PN/call_permissions`, { headers: KEY });
    expect(ok.status).toBe(200);
    expect(stub.state.requests.map((r) => [r.via, r.path, r.auth])).toEqual([
      ['kapso', '/v24.0/PN/call_permissions', 'api-key'],
      ['kapso', '/v24.0/PN/call_permissions', 'api-key'],
    ]);
  });

  it('the bare kapso prefix and a lookalike prefix are not routes', async () => {
    const { url } = await startStub(opts);
    expect((await fetch(`${url}/kapso`, { headers: KEY })).status).toBe(404);
    const lookalike = await fetch(`${url}/kapsox/v24.0/PN/call_permissions`, { headers: KEY });
    expect(lookalike.status).toBe(404);
  });

  it('the crm prefix goes to the crm routes, never to Graph', async () => {
    const { url, stub } = await startStub(opts);
    const res = await fetch(`${url}/crm/api/v1/me`, { headers: { authorization: 'Bearer c' } });
    expect(res.status).toBe(200);
    expect((await fetch(`${url}/crm/api/v1/__stub/messages`)).status).toBe(404);
    expect(stub.state.requests).toEqual([
      { via: 'crm', method: 'GET', path: '/me', auth: 'bearer' },
    ]);
  });
});
