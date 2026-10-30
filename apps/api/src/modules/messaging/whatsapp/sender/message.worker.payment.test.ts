import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import { PaymentHolds } from './hold/payment-holds';
import type { PaymentHoldRepo } from './hold/payment-hold.repo';
import type { MessageDispatch } from './message.dispatch';
import { MessageWorker } from './message.worker';
import { dueMessage } from './sender.fakes';
import type { SenderQueries } from './sender.queries';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// Meta 131042 in the worker: the row and its line wait (one probe per hold), one push a day.

const queries = { claim: vi.fn(), sent: vi.fn(), failure: vi.fn() };
const stale = { expire: vi.fn(), staffAtSend: vi.fn() };
const dispatch = { send: vi.fn(), ready: vi.fn(), multi: true };
const push = { notifyAdmins: vi.fn() };
const repo = { defer: vi.fn() };
const NOW = new Date('2026-10-30T08:00:00Z');
const LATER = new Date('2026-10-30T08:10:00Z');
const text = { template_key: null, template_params: null, body: 'أهلًا', created_by: 'a1' };
const chatText = (id: string) => dueMessage({ ...text, id, line: 'chat' });
const payment = new WaError('(#131042) payment issue', { code: 131042, status: 400 });

function worker() {
  const holds = new PaymentHolds(repo as unknown as PaymentHoldRepo);
  const w = new MessageWorker(
    { ...queries, ...stale } as unknown as SenderQueries,
    dispatch as unknown as MessageDispatch,
    push as unknown as PushService,
    holds,
  );
  w.wait = vi.fn(async () => undefined);
  return w;
}

describe('MessageWorker — 131042 payment hold', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dispatch.ready.mockReturnValue(true);
    queries.claim.mockResolvedValue(1);
    queries.sent.mockResolvedValue(true);
  });

  it('holds the row (queued, try not counted) and pauses the line with the payment push', async () => {
    dispatch.send.mockRejectedValue(payment);
    const row = chatText('m-1');
    await expect(worker().process({ row, template: null, now: NOW, autoOn: true })).resolves.toBe(
      'paused',
    );
    expect(queries.failure).toHaveBeenCalledWith(
      'm-1',
      expect.objectContaining({ status: 'queued', attempts: 0, error_code: 'wa_payment_hold' }),
    );
    expect(push.notifyAdmins).toHaveBeenCalledWith(
      'reminder_failed',
      expect.objectContaining({ subject: 'whatsapp_payment:chat:2026-10-30' }),
    );
  });

  it('the push subject is the same for every held row of the line that day (one push)', async () => {
    dispatch.send.mockRejectedValue(payment);
    await worker().process({ row: chatText('m-1'), template: null, now: NOW, autoOn: true });
    await worker().process({ row: chatText('m-2'), template: null, now: LATER, autoOn: true });
    const subjects = push.notifyAdmins.mock.calls.map(
      (c: unknown[]) => (c[1] as { subject: string }).subject,
    );
    expect(new Set(subjects)).toEqual(new Set(['whatsapp_payment:chat:2026-10-30']));
  });

  it('the line is held: its next row is deferred to the probe time, Meta never asked; another line sends', async () => {
    const w = worker();
    dispatch.send.mockRejectedValueOnce(payment);
    await w.process({ row: chatText('m-1'), template: null, now: NOW, autoOn: true });
    dispatch.send.mockClear();
    await expect(
      w.process({ row: chatText('m-2'), template: null, now: LATER, autoOn: true }),
    ).resolves.toBe('skipped');
    expect(dispatch.send).not.toHaveBeenCalled();
    expect(queries.claim).toHaveBeenCalledTimes(1);
    expect(repo.defer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm-2', attempts: 0, next: '2026-10-30T08:30:00.000Z' }),
    );
    dispatch.send.mockResolvedValue({ waMessageId: 'wamid.n1' });
    await expect(
      w.process({
        row: { ...chatText('m-3'), line: 'notifications' },
        template: null,
        now: LATER,
        autoOn: true,
      }),
    ).resolves.toBe('sent');
  });

  it('a deferred row never waits past its own expiry', async () => {
    const w = worker();
    dispatch.send.mockRejectedValueOnce(payment);
    await w.process({ row: chatText('m-1'), template: null, now: NOW, autoOn: true });
    const expires_at = '2026-10-30T08:20:00.000Z';
    await w.process({
      row: { ...chatText('m-2'), expires_at },
      template: null,
      now: LATER,
      autoOn: true,
    });
    expect(repo.defer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm-2', next: expires_at }),
    );
  });

  it('after the hold the next row is the probe; no row deferred any more', async () => {
    const w = worker();
    dispatch.send.mockRejectedValueOnce(payment).mockResolvedValue({ waMessageId: 'wamid.ok' });
    await w.process({ row: chatText('m-1'), template: null, now: NOW, autoOn: true });
    const probe = new Date('2026-10-30T08:31:00Z');
    await expect(
      w.process({ row: chatText('m-2'), template: null, now: probe, autoOn: true }),
    ).resolves.toBe('sent');
    expect(repo.defer).not.toHaveBeenCalled();
  });

  it('an answer with a wamid is a success: sent, never held', async () => {
    dispatch.send.mockResolvedValue({ waMessageId: 'wamid.ok' });
    await expect(
      worker().process({ row: chatText('m-1'), template: null, now: NOW, autoOn: true }),
    ).resolves.toBe('sent');
    expect(queries.failure).not.toHaveBeenCalled();
    expect(push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('other errors are unchanged: 131026 fails the row, the line keeps sending', async () => {
    const w = worker();
    dispatch.send.mockRejectedValueOnce(
      new WaError('not on WhatsApp', { code: 131026, status: 400 }),
    );
    await expect(
      w.process({ row: chatText('m-1'), template: null, now: NOW, autoOn: true }),
    ).resolves.toBe('failed');
    dispatch.send.mockResolvedValue({ waMessageId: 'wamid.ok' });
    await expect(
      w.process({ row: chatText('m-2'), template: null, now: LATER, autoOn: true }),
    ).resolves.toBe('sent');
  });
});
