import { beforeEach, describe, expect, it } from 'vitest';
import { dueMessage } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { dispatch, NOW, push, queries, resetWorker, worker } from './fixtures/worker';

const template = templateRow();

describe('MessageWorker — uncertain, unrecorded and refused sends (docs/12 §3.3)', () => {
  beforeEach(resetWorker);

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
    expect(queries.failure).toHaveBeenCalledWith(row.id, expect.objectContaining({ status: 'failed', error_code: 'uncertain' }), { attempts: 1 });
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
