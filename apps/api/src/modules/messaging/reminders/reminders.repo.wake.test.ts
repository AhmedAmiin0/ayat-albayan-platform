import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onSenderWake, resetSenderWake } from '@/common/jobs';
import { chainDb } from './chain-db.fake';
import type { QueuedMessage } from './queued-row';
import { RemindersRepo } from './reminders.repo';

// docs/42 42-1: the reminders tick wakes the sender once for its batch (no 30 s poll wait).

const kick = vi.fn(async () => undefined);
const flush = () => new Promise<void>((r) => setTimeout(r, 0));
const row = (key: string) => ({ dedup_key: key }) as unknown as QueuedMessage;

describe('RemindersRepo.queue wakes the sender', () => {
  beforeEach(() => onSenderWake(kick));
  afterEach(() => {
    resetSenderWake();
    kick.mockReset();
  });

  it('a batch with new rows: one wake for the whole batch', async () => {
    const { db } = chainDb({ messages: [{ data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }] });
    expect(await new RemindersRepo(db).queue([row('a'), row('b'), row('c')])).toBe(3);
    await flush();
    expect(kick).toHaveBeenCalledTimes(1);
  });

  it('every row already queued (dedup) or nothing to queue: no wake', async () => {
    const { db } = chainDb({ messages: [{ data: [] }] });
    const repo = new RemindersRepo(db);
    expect(await repo.queue([row('a')])).toBe(0);
    expect(await repo.queue([])).toBe(0);
    await flush();
    expect(kick).not.toHaveBeenCalled();
  });

  it('a failed kick never fails the queue write', async () => {
    kick.mockRejectedValueOnce(new Error('worker down'));
    const { db } = chainDb({ messages: [{ data: [{ id: 'a' }] }] });
    await expect(new RemindersRepo(db).queue([row('a')])).resolves.toBe(1);
    await flush();
    expect(kick).toHaveBeenCalledTimes(1);
  });
});
