import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { CrmInboundRepo } from '@/modules/messaging/webhook/crm-inbound/crm-inbound.repo';
import { RECEIVED_AT, WAMID } from './crm-inbound.fakes';

// The CRM inbound queue (migration 20261121000100): idempotent enqueue, due rows, done, retry.

const T = 'crm_inbound_queue';
const received = {
  waMessageId: WAMID,
  conversationId: 'cv-1',
  contactId: 'ct-1',
  contentType: 'text',
  text: 'سلام',
  at: new Date(RECEIVED_AT),
};

describe('CrmInboundRepo', () => {
  it('enqueue: one row per wamid, a duplicate ignored (rule 8)', async () => {
    const { db, argsOf } = fakeDb({ [T]: [{}] });
    await new CrmInboundRepo(db).enqueue(received);
    expect(argsOf(T, 'upsert')).toEqual([
      {
        wa_message_id: WAMID,
        conversation_id: 'cv-1',
        contact_id: 'ct-1',
        content_type: 'text',
        body: 'سلام',
        received_at: RECEIVED_AT,
      },
      { onConflict: 'wa_message_id', ignoreDuplicates: true },
    ]);
  });

  it('due: next_at reached, oldest first, at most `limit`', async () => {
    const { db, argsOf } = fakeDb({ [T]: [{ data: [] }] });
    const now = new Date('2026-11-21T10:00:00Z');
    await expect(new CrmInboundRepo(db).due(now, 20)).resolves.toEqual([]);
    expect(argsOf(T, 'lte')).toEqual(['next_at', '2026-11-21T10:00:00.000Z']);
    expect(argsOf(T, 'order')).toEqual(['next_at', { ascending: true }]);
    expect(argsOf(T, 'limit')).toEqual([20]);
  });

  it('done deletes the row; retry keeps it with the next attempt', async () => {
    const { db, argsOf } = fakeDb({ [T]: [{}, {}] });
    const repo = new CrmInboundRepo(db);
    await repo.done(WAMID);
    expect(argsOf(T, 'eq')).toEqual(['wa_message_id', WAMID]);
    const nextAt = new Date('2026-11-21T10:05:00Z');
    await repo.retry({ waMessageId: WAMID, attempts: 3, nextAt, error: 'odd answer' });
    expect(argsOf(T, 'update')).toEqual([
      { attempts: 3, next_at: '2026-11-21T10:05:00.000Z', last_error: 'odd answer' },
    ]);
  });

  it('isActiveTeacher: the phone on an active teacher (owner 2026-11-22)', async () => {
    const { db, argsOf } = fakeDb({ teachers: [{ data: [{ id: 't-1' }] }, { data: [] }] });
    const repo = new CrmInboundRepo(db);
    await expect(repo.isActiveTeacher('+966500000001')).resolves.toBe(true);
    expect(argsOf('teachers', 'eq')).toEqual(['status', 'active']);
    await expect(repo.isActiveTeacher('+966500000002')).resolves.toBe(false);
  });

  it('a database error is thrown with what failed', async () => {
    const { db } = fakeDb({ [T]: [{ error: { message: 'down' } }] });
    await expect(new CrmInboundRepo(db).enqueue(received)).rejects.toThrow('crm inbound enqueue');
  });
});
