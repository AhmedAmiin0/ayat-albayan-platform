import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { AppSendRepo } from './app-send.repo';

const W = {
  id: 'm1',
  status: 'queued' as const,
  errorCode: 'awaiting_reply',
  until: new Date('2026-11-06T10:10:00Z'),
};

describe('AppSendRepo.start', () => {
  it('only app_send_until moves, compare-and-set on the status and code read, staff only', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: { id: 'm1' } }] });
    await expect(new AppSendRepo(db).start(W)).resolves.toEqual({ id: 'm1' });
    const f = calls.map((c) => [c.method, ...c.args]);
    expect(f).toContainEqual(['update', { app_send_until: '2026-11-06T10:10:00.000Z' }]);
    expect(f).toContainEqual(['eq', 'status', 'queued']);
    expect(f).toContainEqual(['eq', 'error_code', 'awaiting_reply']);
    expect(f).toContainEqual(['eq', 'direction', 'outbound']);
    expect(f).toContainEqual(['not', 'created_by', 'is', null]);
    expect(f).toContainEqual(['is', 'wa_message_id', null]);
  });

  it('moved meanwhile: null', async () => {
    const { db } = fakeDb({ messages: [{ data: null }] });
    await expect(new AppSendRepo(db).start(W)).resolves.toBeNull();
  });

  it('a database error throws', async () => {
    const { db } = fakeDb({ messages: [{ error: { message: 'boom' } }] });
    await expect(new AppSendRepo(db).start(W)).rejects.toThrow('boom');
  });
});
