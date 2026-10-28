import { describe, expect, it, vi } from 'vitest';
import { CALLS_LINE_ENV, fakeNumberStore } from '../calls-number.fakes';
import { ADMIN_ACTOR, FAMILY, fakeApi, fakeGate, fakeKit } from '../calls.fakes';
import type { CallingLine } from '../kapso/calling-line';
import { CallPermissions } from './call-permission.service';
import { CallsNumberPermission } from './calls-number-permission';
import type { Outbox } from '../../inbox/send/outbox';

vi.mock('../kapso/calling-line', () => ({ callingLine: vi.fn() }));

const CALLS: CallingLine = { env: CALLS_LINE_ENV, numberId: 'n-calls', calls: true };
const REQ = '55555555-5555-4555-8555-555555555555';
const NOW = new Date('2026-10-27T12:00:00Z');
const TEMPLATE = { name: 'call_permission_ar', language: 'ar' };

function setup(o: { canCall?: boolean; lastInbound?: string | null; template?: boolean; messaging?: boolean } = {}) {
  const api = fakeApi();
  api.permission.mockResolvedValue({ canCall: o.canCall ?? false, canRequest: true, expiresAt: null });
  const t = fakeKit({ api });
  const store = fakeNumberStore({ lastInbound: o.lastInbound ?? null });
  const gate = Object.assign(fakeGate(), {
    line: () => CALLS,
    messagingOpen: vi.fn(async () => o.messaging !== false),
    permissionTemplate: vi.fn(async () => (o.template ? TEMPLATE : null)),
  });
  const outbox = { send: vi.fn() };
  const calls = new CallsNumberPermission(t.kit, gate as never, store);
  return { ...t, api, store, outbox, gate, perms: new CallPermissions(t.kit, outbox as unknown as Outbox, calls) };
}
const tap = (s: ReturnType<typeof setup>) => s.perms.request(ADMIN_ACTOR, { phone: FAMILY, clientRequestId: REQ }, NOW);

describe('call permission on the calls number: the state (docs/28 §10)', () => {
  it('granted shows the stored grant\'s expiry when Kapso gives none, and the family\'s last answer', async () => {
    const s = setup({ canCall: true });
    s.store.replies.set(`calls-pn|${FAMILY}`, { response: 'accepted', at: '2026-10-27T09:00:00.000Z', expires_at: '2026-11-03T09:00:00.000Z' });
    await expect(s.perms.state(ADMIN_ACTOR, FAMILY, NOW)).resolves.toEqual({
      state: 'granted', expires_at: '2026-11-03T09:00:00.000Z', reply: { response: 'accepted', at: '2026-10-27T09:00:00.000Z', expires_at: '2026-11-03T09:00:00.000Z' },
    });
  });

  it('inside the calls number\'s own window: the interactive request; outside: the template, else needs_template', async () => {
    await expect(setup({ lastInbound: '2026-10-27T08:00:00Z' }).perms.state(ADMIN_ACTOR, FAMILY, NOW)).resolves.toMatchObject({ state: 'request', via: 'interactive' });
    await expect(setup({ lastInbound: '2026-10-25T08:00:00Z', template: true }).perms.state(ADMIN_ACTOR, FAMILY, NOW)).resolves.toMatchObject({ state: 'request', via: 'template' });
    await expect(setup({ template: false }).perms.state(ADMIN_ACTOR, FAMILY, NOW)).resolves.toMatchObject({ state: 'needs_template', via: 'template', reply: null });
  });

  it('reading the state never sends anything', async () => {
    const s = setup({ lastInbound: '2026-10-27T08:00:00Z', template: true });
    await s.perms.state(ADMIN_ACTOR, FAMILY, NOW);
    expect(s.api.requestPermission).not.toHaveBeenCalled();
    expect(s.threads.enqueue).not.toHaveBeenCalled();
  });
});

describe('«اطلب إذن الاتصال» from the calls number: only on a tap, through the gates', () => {
  it('the interactive request goes FROM the calls number (one request), its row stamped line calls and sent', async () => {
    const s = setup({ lastInbound: '2026-10-27T08:00:00Z' });
    const sent = await tap(s);
    expect(s.api.requestPermission).toHaveBeenCalledTimes(1);
    expect(s.api.requestPermission).toHaveBeenCalledWith(CALLS, { to: FAMILY, text: expect.stringContaining('واتساب') });
    expect(s.threads.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      line: 'calls', number_id: 'n-calls', direction: 'outbound', status: 'failed', error_code: 'sending', created_by: ADMIN_ACTOR.user.id, dedup_key: `call_permission:admin:${FAMILY}:${REQ}`,
    }));
    expect(s.store.sent).toHaveBeenCalledWith('m1', 'wamid.PERM');
    expect(sent).toMatchObject({ replayed: false, view: { status: 'sent' } });
    expect(s.outbox.send).not.toHaveBeenCalled();
  });

  it('outside the window: the approved template of the setting', async () => {
    const s = setup({ template: true });
    await tap(s);
    expect(s.api.requestPermission).toHaveBeenCalledWith(CALLS, { to: FAMILY, template: TEMPLATE });
  });

  it('a repeated tap (same request id) sends nothing more', async () => {
    const s = setup({ lastInbound: '2026-10-27T08:00:00Z' });
    await tap(s);
    await expect(tap(s)).resolves.toMatchObject({ replayed: true });
    expect(s.api.requestPermission).toHaveBeenCalledTimes(1);
  });

  it('the send gate closed (messaging_enabled off): 409 messaging_off, nothing queued or sent', async () => {
    const s = setup({ lastInbound: '2026-10-27T08:00:00Z', messaging: false });
    await expect(tap(s)).rejects.toMatchObject({ response: { code: 'messaging_off' } });
    expect(s.threads.enqueue).not.toHaveBeenCalled();
    expect(s.api.requestPermission).not.toHaveBeenCalled();
  });

  it('a phone off the allow-list (WA_ALLOWED_RECIPIENTS) is refused before anything', async () => {
    const s = setup({ lastInbound: '2026-10-27T08:00:00Z' });
    Object.assign(s.gate, { assertRecipient: fakeGate({ refuse: FAMILY }).assertRecipient });
    await expect(tap(s)).rejects.toMatchObject({ status: 403 });
    expect(s.api.permission).not.toHaveBeenCalled();
    expect(s.api.requestPermission).not.toHaveBeenCalled();
  });

  it('no template set outside the window: 409 permission_needs_template; granted: 409 permission_granted', async () => {
    await expect(tap(setup())).rejects.toMatchObject({ response: { code: 'permission_needs_template' } });
    await expect(tap(setup({ canCall: true }))).rejects.toMatchObject({ response: { code: 'permission_granted' } });
  });

  it('WhatsApp took it but the write failed: no 502 (a second tap would ask twice), the row as it is', async () => {
    const s = setup({ lastInbound: '2026-10-27T08:00:00Z' });
    s.store.sent.mockRejectedValueOnce(new Error('db down'));
    await expect(tap(s)).resolves.toMatchObject({ replayed: false });
    expect(s.store.failed).not.toHaveBeenCalled();
  });

  it('WhatsApp refuses: the row ends failed with the code, 502, never retried', async () => {
    const s = setup({ lastInbound: '2026-10-27T08:00:00Z' });
    s.api.requestPermission.mockRejectedValueOnce(new Error('boom'));
    await expect(tap(s)).rejects.toMatchObject({ status: 502, response: { code: 'request_failed' } });
    expect(s.store.failed).toHaveBeenCalledWith('m1', 'error');
    expect(s.api.requestPermission).toHaveBeenCalledTimes(1);
  });
});
