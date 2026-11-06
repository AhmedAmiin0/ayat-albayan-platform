import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onSenderWake, resetSenderWake } from '@/common/jobs';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { fakePolicy } from '@/modules/messaging/notification-rules/policy/policy.fakes';
import { AlertsRepo } from './alerts.repo';

// docs/42 42-1: a renewal reminder the alerts job queues wakes the sender (no 30 s poll wait).

const kick = vi.fn(async () => undefined);
const flush = () => new Promise<void>((r) => setTimeout(r, 0));
const recipient = { studentName: 'طالب', guardianId: 'g1', phone: '+20100000000' };
const message = (dedupKey: string) => ({ recipient, params: {}, dedupKey, now: new Date() });

describe('AlertsRepo.queueRenewal wakes the sender', () => {
  beforeEach(() => onSenderWake(kick));
  afterEach(() => {
    resetSenderWake();
    kick.mockReset();
  });

  it('a new row: one wake, and the upsert reads back only the ids', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [{ id: 'm1' }] }] });
    await new AlertsRepo(db, fakePolicy()).queueRenewal(message('renewal_due:sub-1'));
    await flush();
    expect(kick).toHaveBeenCalledTimes(1);
    expect(calls.find((c) => c.table === 'messages' && c.method === 'select')?.args).toEqual(['id']);
  });

  it('already queued (dedup) or the rule off: no wake', async () => {
    const dup = fakeDb({ messages: [{ data: [] }] });
    await new AlertsRepo(dup.db, fakePolicy()).queueRenewal(message('renewal_due:sub-1'));
    const off = fakePolicy({ mode: 'module', rows: [{ key: 'renewal_due', enabled: false }] });
    await new AlertsRepo(fakeDb({}).db, off).queueRenewal(message('renewal_due:sub-2'));
    await flush();
    expect(kick).not.toHaveBeenCalled();
  });

  it('a failed kick never fails the write', async () => {
    kick.mockRejectedValueOnce(new Error('worker down'));
    const { db } = fakeDb({ messages: [{ data: [{ id: 'm1' }] }] });
    await expect(new AlertsRepo(db, fakePolicy()).queueRenewal(message('renewal_due:sub-3'))).resolves.toBeUndefined();
    await flush();
    expect(kick).toHaveBeenCalledTimes(1);
  });
});
