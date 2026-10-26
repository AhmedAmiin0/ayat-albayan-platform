import { describe, expect, it, vi } from 'vitest';
import { LINE } from '../calls.fakes';
import { KapsoCallsApi } from './kapso-calls';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function api(...answers: (Response | Error)[]) {
  const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => {
    const next = answers.shift() ?? json({ success: true });
    if (next instanceof Error) throw next;
    return next;
  });
  return { fetch, kapso: new KapsoCallsApi({ fetch, timeoutMs: 1000 }) };
}
const bodyOf = (fetch: ReturnType<typeof vi.fn>, i: number): Record<string, unknown> => {
  const init = fetch.mock.calls[i]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body)) as Record<string, unknown>;
};

describe('KapsoCallsApi (the stub-only fake fetch: no hosted call)', () => {
  it('connect: POST /{phone_number_id}/calls with the offer and our ref, the project key, never a bearer', async () => {
    const { fetch, kapso } = api(json({ messaging_product: 'whatsapp', calls: [{ id: 'wacid.1' }] }));
    await expect(kapso.connect(LINE, { to: '+201001234567', sdp: 'v=0 o', ref: 'call-1' })).resolves.toEqual({ waCallId: 'wacid.1' });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://stub.test/kapso/v24.0/chat-pn/calls');
    expect(init.headers).toMatchObject({ 'x-api-key': 'k' });
    expect(init.headers).not.toHaveProperty('authorization');
    expect(bodyOf(fetch, 0)).toEqual({
      messaging_product: 'whatsapp', to: '201001234567', action: 'connect',
      session: { sdp_type: 'offer', sdp: 'v=0 o' }, biz_opaque_callback_data: 'call-1',
    });
  });

  it('a lost answer is one request and an uncertain WaError (never retried here)', async () => {
    const lost = Object.assign(new Error('socket hang up'), { cause: { code: 'ECONNRESET' } });
    const { fetch, kapso } = api(lost);
    await expect(kapso.connect(LINE, { to: '+201001234567', sdp: 'v=0', ref: 'c' })).rejects.toMatchObject({ info: { uncertain: true } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('accept = pre_accept then accept with the answer; reject / terminate by call id', async () => {
    const { fetch, kapso } = api();
    await kapso.accept(LINE, { waCallId: 'w1', sdp: 'v=0 a', ref: 'c1' });
    await kapso.reject(LINE, 'w2');
    await kapso.terminate(LINE, 'w3');
    expect([0, 1, 2, 3].map((i) => bodyOf(fetch, i)['action'])).toEqual(['pre_accept', 'accept', 'reject', 'terminate']);
    expect(bodyOf(fetch, 1)).toMatchObject({ call_id: 'w1', session: { sdp_type: 'answer', sdp: 'v=0 a' }, biz_opaque_callback_data: 'c1' });
  });

  it('permission: start_call / send_call_permission_request, expiry as UTC', async () => {
    const { fetch, kapso } = api(json({
      permission: { status: 'temporary', expiration_time: 1793000000 },
      actions: [{ action_name: 'start_call', can_perform_action: true }, { action_name: 'send_call_permission_request', can_perform_action: false }],
    }));
    await expect(kapso.permission(LINE, '+201001234567')).resolves.toEqual({ canCall: true, canRequest: false, expiresAt: new Date(1793000000 * 1000).toISOString() });
    expect(String(fetch.mock.calls[0]?.[0] ?? '')).toContain('chat-pn/call_permissions?user_wa_id=201001234567');
  });

  it('Meta\'s error body becomes a WaError with its code (131042 billing)', async () => {
    const { kapso } = api(json({ error: { code: 131042, message: 'payment' } }, 400));
    await expect(kapso.terminate(LINE, 'w')).rejects.toMatchObject({ info: { code: 131042, status: 400 } });
  });
});
