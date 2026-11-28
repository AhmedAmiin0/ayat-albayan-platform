import { afterEach, describe, expect, it, vi } from 'vitest';
import { FAMILY, LINE } from '@/modules/messaging/calls/calls.fakes';
import { callsApp } from '@/modules/messaging/calls/test-app';

vi.mock('@/modules/messaging/calls/kapso/calling-line', () => ({
  callingLine: vi.fn(() => LINE),
}));

type App = Awaited<ReturnType<typeof callsApp>>;
let app: App | null = null;
afterEach(async () => {
  await app?.app.close();
  app = null;
});

const SDP = { sdp: 'v=0\r\no=-' };
const REQUEST = { clientRequestId: '44444444-4444-4444-8444-444444444444' };

describe('calls routes parse their inputs before the handler', () => {
  it('a bad :id is the 400 validation_failed envelope on accept, reject and end', async () => {
    app = await callsApp({ on: true });
    const routes = [
      { method: 'POST' as const, url: '/calls/not-a-uuid/accept', body: SDP },
      { method: 'POST' as const, url: '/calls/not-a-uuid/reject' },
      { method: 'POST' as const, url: '/calls/not-a-uuid/end' },
    ];
    for (const route of routes) {
      const res = await app.call(route);
      expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
    }
    expect(app.api.accept).not.toHaveBeenCalled();
  });

  it('a bad :phone is 400 invalid_phone on the permission state and request', async () => {
    app = await callsApp({ on: true });
    const state = await app.call({ method: 'GET', url: '/calls/permission/not-a-phone' });
    const request = await app.call({
      method: 'POST', url: '/calls/permission/not-a-phone/request', body: REQUEST,
    });
    for (const res of [state, request]) {
      expect([res.statusCode, res.json().code]).toEqual([400, 'invalid_phone']);
    }
    expect(app.api.permission).not.toHaveBeenCalled();
  });

  it('an encoded E.164 :phone still reaches the permission check', async () => {
    app = await callsApp({ on: true });
    const res = await app.call({
      method: 'GET', url: `/calls/permission/${encodeURIComponent(FAMILY)}`,
    });
    expect(res.statusCode).toBe(200);
    expect(app.api.permission).toHaveBeenCalledWith(LINE, FAMILY);
  });

  it('a bad calls-log query is 400 validation_failed; a good one is the log', async () => {
    app = await callsApp({ on: true });
    const bad = await app.call({ method: 'GET', url: '/calls?limit=abc' });
    expect([bad.statusCode, bad.json().message]).toEqual([400, 'validation_failed']);
    expect((await app.call({ method: 'GET', url: '/calls?limit=5' })).statusCode).toBe(200);
  });
});
