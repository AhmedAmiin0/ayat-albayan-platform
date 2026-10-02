import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { MessagesQueries } from './messages.queries';
import { dueMessage } from './sender.fakes';
import { SenderQueries } from './sender.queries';

const M = 'messages';
const NOW = new Date('2026-10-02T08:00:00Z');
const eqs = (calls: { table: string; method: string; args: unknown[] }[], table = M) =>
  calls.filter((c) => c.table === table && c.method === 'eq').map((c) => c.args);

describe('SenderQueries — the outbound queue, compare-and-set (docs/12 §3.3)', () => {
  it('due: queued outbound, due by scheduled_for and next_attempt_at, session text or an approved key', async () => {
    const { db, calls } = fakeDb({ [M]: [{ data: [dueMessage()] }] });
    await expect(new SenderQueries(db).due({ keys: ['booking_confirmation', 'lesson_reminder'], now: NOW, limit: 50 })).resolves.toEqual([dueMessage()]);
    expect(eqs(calls)).toEqual([['direction', 'outbound'], ['status', 'queued']]);
    expect(calls.filter((c) => c.method === 'or').map((c) => c.args[0])).toEqual([
      'scheduled_for.is.null,scheduled_for.lte.2026-10-02T08:00:00.000Z',
      'next_attempt_at.is.null,next_attempt_at.lte.2026-10-02T08:00:00.000Z',
      'template_key.is.null,template_key.in.(booking_confirmation,lesson_reminder)',
    ]);
    expect(calls.find((c) => c.method === 'limit')?.args).toEqual([50]);
  });

  it('due with no approved template reads session texts only', async () => {
    const { db, calls } = fakeDb({ [M]: [{ data: [] }] });
    await new SenderQueries(db).due({ keys: [], now: NOW, limit: 50 });
    expect(calls.filter((c) => c.method === 'or').at(-1)?.args).toEqual(['template_key.is.null']);
  });

  it('claim: attempts n → n+1 with a 2-minute lease, only while queued at n', async () => {
    const { db, calls, argsOf } = fakeDb({ [M]: [{ data: [{ id: 'm1' }] }, { data: [] }] });
    const q = new SenderQueries(db);
    await expect(q.claim({ id: 'm1', attempts: 1, now: NOW })).resolves.toBe(2);
    expect(argsOf(M, 'update')).toEqual([{ attempts: 2, next_attempt_at: '2026-10-02T08:02:00.000Z', error_code: 'sending' }]);
    expect(eqs(calls).slice(0, 3)).toEqual([['id', 'm1'], ['status', 'queued'], ['attempts', 1]]);
    await expect(q.claim({ id: 'm1', attempts: 1, now: NOW })).resolves.toBeNull();
  });

  it('sent: status, wamid, error cleared; stamps the lead and the report it delivered', async () => {
    const row = dueMessage({ lead_id: 'lead-1', dedup_key: 'report_ready:r1' });
    const { db, argsOf, calls } = fakeDb({ [M]: [{ data: [{ id: row.id }] }], leads: [{}], lesson_reports: [{}] });
    await expect(new SenderQueries(db).sent({ row, waMessageId: 'wamid.1', at: NOW })).resolves.toBe(true);
    expect(argsOf(M, 'update')).toEqual([{
      status: 'sent', sent_at: '2026-10-02T08:00:00.000Z', wa_message_id: 'wamid.1', next_attempt_at: null, error_code: null, error_text: null,
    }]);
    expect(eqs(calls)).toEqual([['id', row.id], ['status', 'queued']]);
    expect(argsOf('leads', 'update')).toEqual([{ last_outbound_at: '2026-10-02T08:00:00.000Z' }]);
    expect(argsOf('lesson_reports', 'update')).toEqual([{ sent_at: '2026-10-02T08:00:00.000Z' }]);
    expect(argsOf('lesson_reports', 'eq')).toEqual(['id', 'r1']);
    expect(argsOf('lesson_reports', 'is')).toEqual(['sent_at', null]);
  });

  it('sent on a row the admin marked by hand meanwhile → false; their send already stamped the lead', async () => {
    const { db, calls } = fakeDb({ [M]: [{ data: [] }] });
    const row = dueMessage({ lead_id: 'lead-1', dedup_key: 'report_ready:r1' });
    await expect(new SenderQueries(db).sent({ row, waMessageId: 'w', at: NOW })).resolves.toBe(false);
    expect(calls.some((c) => c.table !== M)).toBe(false);
  });

  it('failure and expiry only touch rows still queued; errors surface', async () => {
    const plan = { status: 'failed' as const, next_attempt_at: null, error_code: '131026', error_text: 'x' };
    const { db, argsOf, calls } = fakeDb({ [M]: [{}, {}, { error: { message: 'boom' } }] });
    const q = new SenderQueries(db);
    await q.failure('m1', plan);
    expect(argsOf(M, 'update')).toEqual([plan]);
    await q.expire('m2', { code: 'stale', text: 'lesson cancelled_by_admin' });
    expect(calls.filter((c) => c.method === 'update').at(-1)?.args[0]).toMatchObject({
      status: 'failed',
      error_code: 'stale',
      error_text: 'lesson cancelled_by_admin',
    });
    expect(eqs(calls).slice(-2)).toEqual([['id', 'm2'], ['status', 'queued']]);
    await expect(q.expire('m3', { code: 'expired', text: 'x' })).rejects.toThrow('boom');
  });

  it('held while automatic messages are OFF: failed auto_off, only if still queued', async () => {
    const { db, calls } = fakeDb({ [M]: [{}] });
    await new SenderQueries(db).expire('m4', { code: 'auto_off', text: 'automatic messages are off in settings' });
    expect(calls.find((c) => c.method === 'update')?.args[0]).toMatchObject({ status: 'failed', error_code: 'auto_off' });
    expect(eqs(calls)).toEqual([['id', 'm4'], ['status', 'queued']]);
    const read = fakeDb({ [M]: [{ data: [] }] });
    await new SenderQueries(read.db).due({ keys: [], now: NOW, limit: 1 });
    expect(String(read.calls.find((c) => c.method === 'select')?.args[0])).toContain('created_by'); // isAutomatic reads it
  });

  it('approvedTemplates reads the approved registry rows', async () => {
    const { db, argsOf } = fakeDb({ message_templates: [{ data: [] }] });
    await new SenderQueries(db).approvedTemplates();
    expect(argsOf('message_templates', 'eq')).toEqual(['status', 'approved']);
  });
});

describe('MessagesQueries — admin retry / sent by hand (M1, M2)', () => {
  it('requeue: failed → queued, attempts 0, error and backoff cleared', async () => {
    const { db, argsOf, calls } = fakeDb({ [M]: [{ data: { id: 'm1' } }] });
    await expect(new MessagesQueries(db).requeue('m1')).resolves.toEqual({ id: 'm1' });
    expect(argsOf(M, 'update')).toEqual([{ status: 'queued', attempts: 0, next_attempt_at: null, error_code: null, error_text: null }]);
    expect(eqs(calls)).toEqual([['id', 'm1'], ['status', 'failed']]);
  });

  it('markSentManually: outbound queued/failed only; stamps sent_manually_at and the delivery side effects', async () => {
    const row = { id: 'm1', lead_id: 'lead-1', dedup_key: 'renewal_due:s1' };
    const { db, argsOf, calls } = fakeDb({ [M]: [{ data: row }, { data: null }], leads: [{}] });
    const q = new MessagesQueries(db);
    await expect(q.markSentManually('m1', NOW)).resolves.toEqual(row);
    expect(argsOf(M, 'update')).toEqual([
      { status: 'sent_manually', sent_manually_at: '2026-10-02T08:00:00.000Z', next_attempt_at: null, error_code: null, error_text: null },
    ]);
    expect(argsOf(M, 'in')).toEqual(['status', ['queued', 'failed']]);
    expect(argsOf(M, 'or')).toEqual(['error_code.is.null,error_code.neq.sending']);
    expect(eqs(calls)).toEqual([['id', 'm1'], ['direction', 'outbound']]);
    expect(argsOf('leads', 'eq')).toEqual(['id', 'lead-1']);
    expect(calls.some((c) => c.table === 'lesson_reports')).toBe(false);
    await expect(q.markSentManually('m1', NOW)).resolves.toBeNull();
  });

  it('handOff: outbound queued/failed, not claimed by the sender → failed «handed_off» (the sender skips it)', async () => {
    const { db, argsOf } = fakeDb({ [M]: [{ data: { id: 'm1' } }] });
    await expect(new MessagesQueries(db).handOff('m1')).resolves.toEqual({ id: 'm1' });
    expect(argsOf(M, 'update')).toEqual([expect.objectContaining({ status: 'failed', error_code: 'handed_off', next_attempt_at: null })]);
    expect(argsOf(M, 'in')).toEqual(['status', ['queued', 'failed']]);
    expect(argsOf(M, 'or')).toEqual(['error_code.is.null,error_code.neq.sending']);
  });
});
