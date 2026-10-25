import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushService } from '../../../common/push/push.service';
import type { MessageDispatch } from './message.dispatch';
import { MessageWorker } from './message.worker';
import { dueMessage } from './sender.fakes';
import type { SenderQueries } from './sender.queries';
import { REPORT_READY, templateRow } from '../whatsapp.fakes';
import { WaError } from '../whatsapp.types';

const queries = { claim: vi.fn(), sent: vi.fn(), failure: vi.fn(), expire: vi.fn(), staffAtSend: vi.fn() };
const dispatch = { send: vi.fn(), ready: vi.fn(), multi: false };
const push = { notifyAdmins: vi.fn() };
const NOW = new Date('2026-10-02T08:00:00Z');
const template = templateRow();
const staleLead = { status: 'no_reply', follow_up_paused: false, last_inbound_at: null, created_at: '2026-10-01T00:00:00Z' } as const;

function worker() {
  const w = new MessageWorker(queries as unknown as SenderQueries, dispatch as unknown as MessageDispatch, push as unknown as PushService);
  w.wait = vi.fn(async () => undefined);
  return w;
}

describe('MessageWorker — one queued row (docs/12 §3.3)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queries.claim.mockResolvedValue(1);
    queries.sent.mockResolvedValue(true);
    dispatch.send.mockResolvedValue({ waMessageId: 'wamid.1' });
    dispatch.ready.mockReturnValue(true);
  });

  it('claims (attempt +1) before calling Meta, then records sent with the wamid', async () => {
    await expect(worker().process({ row: dueMessage(), template, now: NOW, autoOn: true })).resolves.toBe('sent');
    expect(queries.claim).toHaveBeenCalledWith({ id: dueMessage().id, attempts: 0, now: NOW });
    expect(dispatch.send).toHaveBeenCalledWith(dueMessage(), template, 'notifications');
    expect(queries.sent).toHaveBeenCalledWith(expect.objectContaining({ row: dueMessage(), waMessageId: 'wamid.1' }));
    const [claim, send, sent] = [queries.claim, dispatch.send, queries.sent].map((f) => f.mock.invocationCallOrder[0] ?? 0);
    expect(claim).toBeLessThan(send ?? 0);
    expect(send).toBeLessThan(sent ?? 0);
  });

  it('another worker claimed it first → skipped, Meta never called', async () => {
    queries.claim.mockResolvedValue(null);
    await expect(worker().process({ row: dueMessage(), template, now: NOW, autoOn: true })).resolves.toBe('skipped');
    expect(dispatch.send).not.toHaveBeenCalled();
  });

  it('a lesson reminder after the lesson started expires: failed «expired», no claim, no push', async () => {
    const row = dueMessage({ lesson: { starts_at: '2026-10-02T07:59:00Z', status: 'scheduled' } });
    await expect(worker().process({ row, template, now: NOW, autoOn: true })).resolves.toBe('expired');
    expect(queries.expire).toHaveBeenCalledWith(row.id, { code: 'expired', text: 'expired before it was sent' });
    expect(queries.claim).not.toHaveBeenCalled();
    expect(push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('past expires_at expires too (follow-ups)', async () => {
    const row = dueMessage({ template_key: 'follow_up_slots', lesson: null, expires_at: '2026-10-02T07:00:00Z' });
    await expect(worker().process({ row, template, now: NOW, autoOn: true })).resolves.toBe('expired');
  });

  it('a report whose PDF is not attached yet waits: no claim, no attempt counted', async () => {
    const row = dueMessage({ template_key: 'report_ready', template_params: { '1': 'سلمى' }, lesson: null });
    await expect(worker().process({ row, template: REPORT_READY, now: NOW, autoOn: true })).resolves.toBe('skipped');
    expect(queries.claim).not.toHaveBeenCalled();
  });

  it('a retryable Meta error stays queued with the backoff, no push', async () => {
    dispatch.send.mockRejectedValue(new WaError('rate', { code: 130429, status: 429 }));
    await expect(worker().process({ row: dueMessage(), template, now: NOW, autoOn: true })).resolves.toBe('retry');
    expect(queries.failure).toHaveBeenCalledWith(dueMessage().id, expect.objectContaining({
      status: 'queued',
      next_attempt_at: '2026-10-02T08:01:00.000Z',
      error_code: '130429',
    }));
    expect(push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('a permanent error (131026) fails at once and pushes reminder_failed to the admins', async () => {
    dispatch.send.mockRejectedValue(new WaError('(#131026) undeliverable', { code: 131026, status: 400 }));
    await expect(worker().process({ row: dueMessage(), template, now: NOW, autoOn: true })).resolves.toBe('failed');
    expect(queries.failure).toHaveBeenCalledWith(dueMessage().id, expect.objectContaining({ status: 'failed', error_code: '131026' }));
    expect(push.notifyAdmins).toHaveBeenCalledWith('reminder_failed', {
      subject: `${dueMessage().id}:${NOW.getTime()}`,
      vars: { template: 'تأكيد الحجز — رابط Jitsi', name: 'أم سلمى' },
      data: { phone: '+966551234567', messageId: dueMessage().id },
    });
  });

  it('retryable errors fail on the third try; the push names the lead, else the phone', async () => {
    queries.claim.mockResolvedValue(3);
    dispatch.send.mockRejectedValue(new WaError('refused', { code: null, status: 0, uncertain: false }));
    const row = dueMessage({ guardian: null, lead: { ...staleLead, name: null }, attempts: 2 });
    await expect(worker().process({ row, template, now: NOW, autoOn: true })).resolves.toBe('failed');
    expect(push.notifyAdmins).toHaveBeenCalledWith('reminder_failed', expect.objectContaining({
      vars: expect.objectContaining({ name: '+966551234567' }),
    }));
  });

  it('the «sent» write is retried, never followed by a resend; an admin’s manual mark stands', async () => {
    queries.sent.mockRejectedValueOnce(new Error('db blip')).mockResolvedValueOnce(false);
    const w = worker();
    await expect(w.process({ row: dueMessage(), template, now: NOW, autoOn: true })).resolves.toBe('sent');
    expect(dispatch.send).toHaveBeenCalledTimes(1);
    expect(queries.sent).toHaveBeenCalledTimes(2);
    expect(vi.mocked(w.wait)).toHaveBeenCalledWith(500);
  });

  it('a confirmation for a lesson cancelled since it was queued goes stale: never sent, no push', async () => {
    const row = dueMessage({ lesson: { starts_at: '2026-10-04T14:00:00Z', status: 'cancelled_by_admin' } });
    await expect(worker().process({ row, template, now: NOW, autoOn: true })).resolves.toBe('stale');
    expect(queries.expire).toHaveBeenCalledWith(row.id, { code: 'stale', text: 'lesson cancelled_by_admin' });
    expect(queries.claim).not.toHaveBeenCalled();
    expect(push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('a timeout after the request left: failed «uncertain» for the admin, never resent', async () => {
    dispatch.send.mockRejectedValue(new WaError('timeout', { code: null, status: 0, uncertain: true }));
    await expect(worker().process({ row: dueMessage(), template, now: NOW, autoOn: true })).resolves.toBe('failed');
    expect(queries.failure).toHaveBeenCalledWith(dueMessage().id, expect.objectContaining({ status: 'failed', error_code: 'uncertain' }));
    expect(push.notifyAdmins).toHaveBeenCalledTimes(1);
  });

  it('a row still marked «sending» (outcome never recorded): handed to the admin, Meta not called again', async () => {
    const row = dueMessage({ error_code: 'sending', attempts: 1 });
    await expect(worker().process({ row, template, now: NOW, autoOn: true })).resolves.toBe('failed');
    expect(dispatch.send).not.toHaveBeenCalled();
    expect(queries.claim).not.toHaveBeenCalled();
    expect(queries.failure).toHaveBeenCalledWith(row.id, expect.objectContaining({ status: 'failed', error_code: 'uncertain' }));
  });

  it('an expired token: the row waits uncounted, one push a day, the pass pauses', async () => {
    dispatch.send.mockRejectedValue(new WaError('Error validating access token', { code: 190, status: 401 }));
    await expect(worker().process({ row: dueMessage(), template, now: NOW, autoOn: true })).resolves.toBe('paused');
    expect(queries.failure).toHaveBeenCalledWith(dueMessage().id, expect.objectContaining({ status: 'queued', attempts: 0, error_code: '190' }));
    expect(push.notifyAdmins).toHaveBeenCalledWith('reminder_failed', expect.objectContaining({ subject: 'whatsapp_auth:2026-10-02' }));
  });

  it('never throws: a DB error is logged and the row skipped', async () => {
    queries.claim.mockRejectedValue(new Error('db down'));
    await expect(worker().process({ row: dueMessage(), template, now: NOW, autoOn: true })).resolves.toBe('skipped');
  });
});
