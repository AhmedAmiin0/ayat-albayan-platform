import { afterEach, describe, expect, it, vi } from 'vitest';
import { FAMILY, LINE } from '../calls.fakes';
import { callsApp } from '../test-app';

vi.mock('../kapso/calling-line', () => ({ callingLine: vi.fn(() => LINE) }));

let app: Awaited<ReturnType<typeof callsApp>> | null = null;
afterEach(async () => {
  await app?.app.close();
  app = null;
});
const start = { phone: FAMILY, sdp: 'v=0\r\no=-', clientRequestId: '55555555-5555-4555-8555-555555555555' };

describe('calls routes (docs/28 §4)', () => {
  it('off: /calls/config says so, every other route is 404 calls_disabled and nothing reaches Kapso', async () => {
    app = await callsApp({ on: false });
    const config = await app.call({ method: 'GET', url: '/calls/config' });
    expect(config.json()).toEqual({ enabled: false, available: true, canCall: true, iceServers: [] });
    for (const req of [
      { method: 'GET' as const, url: '/calls/active' },
      { method: 'GET' as const, url: '/calls' },
      { method: 'POST' as const, url: '/calls', body: start },
      { method: 'GET' as const, url: `/calls/permission/${encodeURIComponent(FAMILY)}` },
    ]) {
      const res = await app.call(req);
      expect([req.url, res.statusCode, res.json().code]).toEqual([req.url, 404, 'calls_disabled']);
    }
    expect(app.api.connect).not.toHaveBeenCalled();
    expect(app.api.permission).not.toHaveBeenCalled();
  });

  it('on: config carries the ICE servers; a call starts (201) and shows in /calls/active', async () => {
    app = await callsApp({ on: true });
    expect((await app.call({ method: 'GET', url: '/calls/config' })).json()).toMatchObject({ enabled: true, iceServers: [{ urls: [expect.stringMatching(/^stun:/)] }] });
    const res = await app.call({ method: 'POST', url: '/calls', body: start });
    expect(res.statusCode).toBe(201);
    expect(app.api.connect).toHaveBeenCalledTimes(1);
    const active = (await app.call({ method: 'GET', url: '/calls/active' })).json();
    expect(active).toMatchObject([{ id: res.json().id, direction: 'outbound', status: 'connecting' }]);
  });

  it('role guards: guardian and assistant are refused; a teacher only in their families\' chats', async () => {
    app = await callsApp({ on: true });
    expect((await app.call({ method: 'POST', url: '/calls', body: start, token: 'guardian' })).statusCode).toBe(403);
    expect((await app.call({ method: 'GET', url: '/calls/active', token: 'assistant' })).statusCode).toBe(403);
    const other = { ...start, phone: '+201005555555' };
    const res = await app.call({ method: 'POST', url: '/calls', body: other, token: 'teacher' });
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_thread']);
    expect((await app.call({ method: 'POST', url: '/calls', body: start, token: 'teacher' })).statusCode).toBe(201);
  });

  it('validates bodies: a non-SDP or no request id is 400', async () => {
    app = await callsApp({ on: true });
    expect((await app.call({ method: 'POST', url: '/calls', body: { ...start, sdp: 'hello' } })).statusCode).toBe(400);
    expect((await app.call({ method: 'POST', url: '/calls', body: { phone: FAMILY, sdp: 'v=0' } })).statusCode).toBe(400);
    expect((await app.call({ method: 'POST', url: '/calls/not-a-uuid/end' })).statusCode).toBe(400);
  });
});
