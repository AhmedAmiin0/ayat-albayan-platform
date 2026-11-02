import { describe, expect, it } from 'vitest';
import { CALLS_LINE_ENV } from '@/modules/messaging/calls/calls-number.fakes';
import { WaError } from '@/modules/messaging/whatsapp';
import { KapsoCallsApi } from './kapso-calls';

// docs/36 h8b: the call permission request is a `POST {phone}/messages` like any send, so a 2xx
// without a message id is `uncertain` (it may have reached the family). Fake fetch only.

const LINE = { env: CALLS_LINE_ENV, numberId: 'n-calls', calls: true as const };
const answer = (body: unknown) => () =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

describe('KapsoCallsApi.requestPermission: a 2xx without a message id', () => {
  it.each([[{}], [{ messages: [] }]])('%j: status 200, uncertain', async (body) => {
    const api = new KapsoCallsApi({ fetch: answer(body), timeoutMs: 1000 });
    const e = await api.requestPermission(LINE, { to: '+201001234567', text: 'x' }).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(WaError);
    expect((e as WaError).info).toMatchObject({ code: null, status: 200, uncertain: true });
  });

  it('a read (the permission check) keeps a 2xx shape failure certain', async () => {
    const api = new KapsoCallsApi({ fetch: answer({ actions: 'x' }), timeoutMs: 1000 });
    const e = await api.permission(LINE, '+201001234567').catch((x: unknown) => x);
    expect((e as WaError).info.uncertain).toBeUndefined();
  });
});
