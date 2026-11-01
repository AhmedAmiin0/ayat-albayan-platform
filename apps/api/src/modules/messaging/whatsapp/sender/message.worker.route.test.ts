import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import type { MessageDispatch } from './message.dispatch';
import { authSubject } from './message.job';
import { MessageWorker, type SendJob } from './message.worker';
import { N2 } from '@/modules/messaging/whatsapp/numbers/number-route.fakes';
import { dueMessage } from './sender.fakes';
import type { SenderRepo } from './sender.repo';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// docs/23c decision 8: the claim stamps the chosen number and line = its role; a broken token pauses that number.

const queries = { claim: vi.fn(), sent: vi.fn(), failure: vi.fn(), expire: vi.fn(), staffAtSend: vi.fn() };
const dispatch = { send: vi.fn(), ready: vi.fn(), multi: false };
const push = { notifyAdmins: vi.fn() };
const NOW = new Date('2026-10-02T08:00:00Z');
const route = { numberId: N2, line: 'chat' as const };

function run(over: Partial<SendJob> = {}) {
  const w = new MessageWorker(queries as unknown as SenderRepo, dispatch as unknown as MessageDispatch, push as unknown as PushService);
  w.wait = vi.fn(async () => undefined);
  return w.process({ row: dueMessage(), template: templateRow(), now: NOW, autoOn: true, route, ...over });
}

describe('MessageWorker — a routed row (module mode)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dispatch.ready.mockReturnValue(true);
    dispatch.send.mockResolvedValue({ waMessageId: 'wamid.1' });
    queries.claim.mockResolvedValue(1);
    queries.sent.mockResolvedValue(true);
  });

  it('claims with number_id and line = the number\'s role, and sends through that number', async () => {
    await expect(run()).resolves.toBe('sent');
    expect(dispatch.ready).toHaveBeenCalledWith(dueMessage(), route);
    expect(queries.claim).toHaveBeenCalledWith({ id: dueMessage().id, attempts: 0, now: NOW, line: 'chat', numberId: N2 });
    expect(dispatch.send).toHaveBeenCalledWith(dueMessage(), templateRow(), route);
  });

  it('route null (no number can send it) → skipped, never claimed, never sent', async () => {
    await expect(run({ route: null })).resolves.toBe('skipped');
    expect(queries.claim).not.toHaveBeenCalled();
    expect(dispatch.send).not.toHaveBeenCalled();
  });

  it('route null still expires a row past its use (as an unconfigured line today)', async () => {
    await expect(run({ route: null, row: dueMessage({ expires_at: '2026-10-01T00:00:00Z' }) })).resolves.toBe('expired');
  });

  it('number not ready (client gone / recipient not allowed) → skipped, untouched', async () => {
    dispatch.ready.mockReturnValue(false);
    await expect(run()).resolves.toBe('skipped');
    expect(queries.claim).not.toHaveBeenCalled();
  });

  it('a broken token → paused, one push per number per day', async () => {
    dispatch.send.mockRejectedValue(new WaError('Error validating access token', { code: 190, status: 401 }));
    await expect(run()).resolves.toBe('paused');
    expect(push.notifyAdmins).toHaveBeenCalledWith('reminder_failed', expect.objectContaining({ subject: `whatsapp_auth:number:${N2}:2026-10-02` }));
  });
});

describe('authSubject', () => {
  it('legacy subjects are unchanged per line; module mode keys by number', () => {
    expect(authSubject({ line: 'notifications', now: NOW })).toBe('whatsapp_auth:2026-10-02');
    expect(authSubject({ line: 'chat', now: NOW })).toBe('whatsapp_auth:chat:2026-10-02');
    expect(authSubject({ line: 'chat', route: null, now: NOW })).toBe('whatsapp_auth:chat:2026-10-02');
    expect(authSubject({ line: 'chat', route, now: NOW })).toBe(`whatsapp_auth:number:${N2}:2026-10-02`);
  });
});
