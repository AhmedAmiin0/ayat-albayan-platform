import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onSenderWake, resetSenderWake } from '@/common/jobs';
import { chainDb } from '@/modules/messaging/reminders/chain-db.fake';
import type { QueuedMessage } from '@/modules/messaging/reminders';
import { FollowUpsRepo } from './follow-ups.repo';

// docs/42 42-1: a follow-up row wakes the sender; a tick's many leads coalesce into one more pass.

const kick = vi.fn(async () => undefined);
const flush = () => new Promise<void>((r) => setTimeout(r, 0));
const row = (key: string) => ({ dedup_key: key }) as unknown as QueuedMessage;

describe('FollowUpsRepo.queue wakes the sender', () => {
  beforeEach(() => onSenderWake(kick));
  afterEach(() => {
    resetSenderWake();
    kick.mockReset();
  });

  it('a new row: one wake; a duplicate (dedup): none', async () => {
    const { db } = chainDb({ messages: [{ data: [] }, { data: [{ id: 'm1' }] }] });
    const repo = new FollowUpsRepo(db);
    expect(await repo.queue(row('follow_up_slots:lead-1:1:0'))).toBe(0);
    await flush();
    expect(kick).not.toHaveBeenCalled();
    expect(await repo.queue(row('follow_up_slots:lead-2:1:0'))).toBe(1);
    await flush();
    expect(kick).toHaveBeenCalledTimes(1);
  });

  it('rows of one tick while the pass runs: one extra kick, not one per lead', async () => {
    let finish: () => void = () => undefined;
    kick.mockReturnValueOnce(new Promise<undefined>((r) => (finish = () => r(undefined))));
    const added = Array.from({ length: 5 }, (_, i) => ({ data: [{ id: `m${i}` }] }));
    const repo = new FollowUpsRepo(chainDb({ messages: added }).db);
    for (let i = 0; i < 5; i += 1) await repo.queue(row(`follow_up_slots:lead-${i}:1:0`));
    await flush();
    expect(kick).toHaveBeenCalledTimes(1);
    finish();
    await flush();
    expect(kick).toHaveBeenCalledTimes(2);
  });
});
