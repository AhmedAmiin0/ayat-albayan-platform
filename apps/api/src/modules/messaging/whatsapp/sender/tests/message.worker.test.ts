import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dueMessage } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { REPORT_READY, templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { dispatch, NOW, push, queries, resetWorker, worker } from './fixtures/worker';

const template = templateRow();
const staleLead = { status: 'no_reply', follow_up_paused: false, last_inbound_at: null, created_at: '2026-10-01T00:00:00Z' } as const;

describe('MessageWorker — one queued row (docs/12 §3.3)', () => {
  beforeEach(resetWorker);

  it('claims (attempt +1) before calling Meta, then records sent with the wamid', async () => {
    await expect(worker().process({ row: dueMessage(), template, now: NOW, autoOn: true })).resolves.toBe('sent');
    expect(queries.claim).toHaveBeenCalledWith({ id: dueMessage().id, attempts: 0, now: NOW });
    expect(dispatch.send).toHaveBeenCalledWith(dueMessage(), template, 'notifications');
    expect(queries.sent).toHaveBeenCalledWith(expect.objectContaining({ row: dueMessage(), sent: { waMessageId: 'wamid.1' } }));
    const [claim, send, sent] = [queries.claim, dispatch.send, queries.sent].map(
      (f) => f.mock.invocationCallOrder[0] ?? 0,
    );
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
});
