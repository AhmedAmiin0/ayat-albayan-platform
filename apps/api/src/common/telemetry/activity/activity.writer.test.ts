import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { ActivityWriter, type ActivityInsert } from './activity.writer';

const row = (over: Partial<ActivityInsert> = {}): ActivityInsert => ({
  action: 'expenses.create',
  method: 'POST',
  route: '/expenses',
  status: 201,
  ...over,
});

function fakeDb(insert: ReturnType<typeof vi.fn>) {
  const from = vi.fn().mockReturnValue({ insert });
  return { db: { from } as unknown as Db, from };
}

afterEach(() => vi.useRealTimers());

describe('ActivityWriter', () => {
  it('queues without touching the DB, then writes one batch on flush', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const { db, from } = fakeDb(insert);
    const writer = new ActivityWriter(db);
    writer.push(row());
    writer.push(row({ action: 'expenses.remove', method: 'DELETE' }));
    expect(from).not.toHaveBeenCalled();
    await writer.flush();
    expect(from).toHaveBeenCalledWith('activity_log');
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it('flushes by itself a few seconds after the first push', async () => {
    vi.useFakeTimers();
    const insert = vi.fn().mockResolvedValue({ error: null });
    const writer = new ActivityWriter(fakeDb(insert).db);
    writer.push(row());
    await vi.advanceTimersByTimeAsync(3_000);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('never throws when the insert fails or rejects', async () => {
    const failing = vi.fn().mockResolvedValue({ error: { code: '42501', message: 'denied' } });
    const w1 = new ActivityWriter(fakeDb(failing).db);
    w1.push(row());
    await expect(w1.flush()).resolves.toBeUndefined();

    const rejecting = vi.fn().mockRejectedValue(new Error('network down'));
    const w2 = new ActivityWriter(fakeDb(rejecting).db);
    w2.push(row());
    await expect(w2.flush()).resolves.toBeUndefined();
  });

  it('retries row by row when one actor no longer exists, so the others are kept', async () => {
    const insert = vi
      .fn()
      .mockResolvedValueOnce({ error: { code: '23503', message: 'fk' } })
      .mockResolvedValue({ error: null });
    const writer = new ActivityWriter(fakeDb(insert).db);
    writer.push(row({ actor_id: 'gone' }));
    writer.push(row());
    await writer.flush();
    expect(insert).toHaveBeenCalledTimes(3);
  });

  it('flushes what is left when the app shuts down', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const writer = new ActivityWriter(fakeDb(insert).db);
    writer.push(row());
    await writer.onModuleDestroy();
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
