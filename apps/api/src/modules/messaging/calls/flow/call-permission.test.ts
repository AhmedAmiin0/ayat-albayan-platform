import { describe, expect, it, vi } from 'vitest';
import type { Outbox } from '../../inbox/send/outbox';
import { pickSend } from '../../inbox/send/send-number';
import { ADMIN_ACTOR, FAMILY, LINE, fakeApi, fakeGate, fakeKit, teacherActor } from '../calls.fakes';
import { CallPermissions, fromCallingNumber } from './call-permission.service';

vi.mock('../../inbox/send/send-number', () => ({ pickSend: vi.fn(async () => ({ line: 'chat' })) }));
const REQ = '44444444-4444-4444-8444-444444444444';

function setup(facts: { canCall: boolean; canRequest: boolean }) {
  const api = fakeApi();
  api.permission.mockResolvedValue({ ...facts, expiresAt: facts.canCall ? '2026-11-02T10:00:00.000Z' : null });
  const t = fakeKit({ api });
  const outbox = { send: vi.fn(async () => ({ view: { id: 'm1' }, replayed: false })) };
  return { ...t, outbox, perms: new CallPermissions(t.kit, fakeGate(), outbox as unknown as Outbox) };
}

describe('CallPermissions.state (Kapso call_permissions)', () => {
  it('granted, with its expiry', async () => {
    await expect(setup({ canCall: true, canRequest: false }).perms.state(ADMIN_ACTOR, FAMILY)).resolves.toEqual({
      state: 'granted', expires_at: '2026-11-02T10:00:00.000Z',
    });
  });

  it('no permission: «request» inside the calling number\'s window, else needs_template; limited when WhatsApp refuses both', async () => {
    const { perms } = setup({ canCall: false, canRequest: true });
    await expect(perms.state(ADMIN_ACTOR, FAMILY)).resolves.toMatchObject({ state: 'request' });
    vi.mocked(pickSend).mockResolvedValueOnce({ code: 'session_closed' });
    await expect(perms.state(ADMIN_ACTOR, FAMILY)).resolves.toMatchObject({ state: 'needs_template' });
    vi.mocked(pickSend).mockResolvedValueOnce({});
    await expect(perms.state(ADMIN_ACTOR, FAMILY)).resolves.toMatchObject({ state: 'needs_template' });
    await expect(setup({ canCall: false, canRequest: false }).perms.state(ADMIN_ACTOR, FAMILY)).resolves.toMatchObject({ state: 'limited' });
  });

  it('a teacher outside the chat is refused before Kapso is asked', async () => {
    const { perms, api } = setup({ canCall: true, canRequest: true });
    await expect(perms.state(teacherActor([]), FAMILY)).rejects.toMatchObject({ status: 403 });
    expect(api.permission).not.toHaveBeenCalled();
  });
});

describe('«اطلب إذن الاتصال» goes through the outbox gate', () => {
  it('queues one interactive call_permission_request from the chat line, as a staff send with its own dedup key', async () => {
    const { perms, outbox } = setup({ canCall: false, canRequest: true });
    await perms.request(ADMIN_ACTOR, { phone: FAMILY, clientRequestId: REQ });
    expect(outbox.send).toHaveBeenCalledTimes(1);
    expect(outbox.send).toHaveBeenCalledWith(expect.objectContaining({
      phone_e164: FAMILY, line: 'chat', created_by: ADMIN_ACTOR.user.id, guardian_id: 'g1',
      dedup_key: `call_permission:admin:${FAMILY}:${REQ}`, interactive_payload: { type: 'call_permission_request' },
      body: expect.stringContaining('واتساب'),
    }));
  });

  it('refuses (409) when the permission is already there or only a template could ask', async () => {
    await expect(setup({ canCall: true, canRequest: true }).perms.request(ADMIN_ACTOR, { phone: FAMILY, clientRequestId: REQ })).rejects.toMatchObject({
      response: { code: 'permission_granted' },
    });
    const { perms, outbox } = setup({ canCall: false, canRequest: true });
    vi.mocked(pickSend).mockResolvedValueOnce({ code: 'session_closed' });
    await expect(perms.request(ADMIN_ACTOR, { phone: FAMILY, clientRequestId: REQ })).rejects.toMatchObject({ response: { code: 'permission_needs_template' } });
    expect(outbox.send).not.toHaveBeenCalled();
  });
});

describe('fromCallingNumber', () => {
  it('legacy: the chat line; module mode: the calling number itself', () => {
    expect(fromCallingNumber({ line: 'chat' }, LINE)).toBe(true);
    expect(fromCallingNumber({ line: 'notifications' }, LINE)).toBe(false);
    const moduleLine = { ...LINE, numberId: 'n-chat' };
    expect(fromCallingNumber({ line: 'chat', number_id: 'n-chat' }, moduleLine)).toBe(true);
    expect(fromCallingNumber({ line: 'chat', number_id: 'n-other' }, moduleLine)).toBe(false);
  });
});
