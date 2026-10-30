import { beforeEach, describe, expect, it } from 'vitest';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import {
  dispatch,
  job,
  LATER,
  payment,
  push,
  queries,
  reminder,
  repo,
  resetPaymentFakes,
  subjects,
  worker,
} from './message.worker.payment.fakes';

// Meta 131042 in the worker: the row and its line wait (one probe per hold), one push a day.

describe('MessageWorker — 131042 payment hold', () => {
  beforeEach(resetPaymentFakes);

  it('holds the row (queued, try not counted) and pauses the line with the payment push', async () => {
    dispatch.send.mockRejectedValue(payment);
    await expect(worker().process(job(reminder('m-1')))).resolves.toBe('paused');
    expect(queries.failure).toHaveBeenCalledWith(
      'm-1',
      expect.objectContaining({ status: 'queued', attempts: 0, error_code: 'wa_payment_hold' }),
    );
    expect(subjects()).toEqual(['whatsapp_payment:2026-10-30']);
  });

  it('the push subject is the same for every held row of the line that day (one push)', async () => {
    dispatch.send.mockRejectedValue(payment);
    await worker().process(job(reminder('m-1')));
    await worker().process(job(reminder('m-2'), LATER));
    expect(new Set(subjects())).toEqual(new Set(['whatsapp_payment:2026-10-30']));
  });

  it('the line is held: its next row is deferred after the probe, Meta never asked; another line sends', async () => {
    const w = worker();
    dispatch.send.mockRejectedValueOnce(payment);
    await w.process(job(reminder('m-1')));
    dispatch.send.mockClear();
    await expect(w.process(job(reminder('m-2'), LATER))).resolves.toBe('skipped');
    expect(dispatch.send).not.toHaveBeenCalled();
    expect(queries.claim).toHaveBeenCalledTimes(1);
    expect(repo.defer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm-2', attempts: 0, next: '2026-10-30T08:32:00.000Z' }),
    );
    dispatch.send.mockResolvedValue({ waMessageId: 'wamid.n1' });
    const chat = { ...job(reminder('m-3'), LATER), template: null };
    const text = { ...chat, row: { ...chat.row, template_key: null, body: 'نص', line: 'chat' as const } };
    await expect(w.process(text)).resolves.toBe('sent');
  });

  it('a row expiring before the deferral end is not deferred: it goes through as a probe', async () => {
    const w = worker();
    dispatch.send.mockRejectedValue(payment);
    await w.process(job(reminder('m-1')));
    const expires_at = '2026-10-30T08:20:00.000Z';
    await w.process(job(reminder('m-2', { expires_at }), LATER));
    expect(repo.defer).not.toHaveBeenCalled();
    expect(dispatch.send).toHaveBeenCalledTimes(2);
    expect(queries.failure).toHaveBeenLastCalledWith(
      'm-2',
      expect.objectContaining({ status: 'queued', next_attempt_at: expires_at }),
    );
  });

  it('after the hold the next row is the probe; no row deferred any more', async () => {
    const w = worker();
    dispatch.send.mockRejectedValueOnce(payment).mockResolvedValue({ waMessageId: 'wamid.ok' });
    await w.process(job(reminder('m-1')));
    const probe = new Date('2026-10-30T08:31:00Z');
    await expect(w.process(job(reminder('m-2'), probe))).resolves.toBe('sent');
    expect(repo.defer).not.toHaveBeenCalled();
  });

  it('an answer with a wamid is a success: sent, never held', async () => {
    dispatch.send.mockResolvedValue({ waMessageId: 'wamid.ok' });
    await expect(worker().process(job(reminder('m-1')))).resolves.toBe('sent');
    expect(queries.failure).not.toHaveBeenCalled();
    expect(push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('other errors are unchanged: 131026 fails the row, the line keeps sending', async () => {
    const w = worker();
    dispatch.send.mockRejectedValueOnce(
      new WaError('not on WhatsApp', { code: 131026, status: 400 }),
    );
    await expect(w.process(job(reminder('m-1')))).resolves.toBe('failed');
    dispatch.send.mockResolvedValue({ waMessageId: 'wamid.ok' });
    await expect(w.process(job(reminder('m-2'), LATER))).resolves.toBe('sent');
  });
});
