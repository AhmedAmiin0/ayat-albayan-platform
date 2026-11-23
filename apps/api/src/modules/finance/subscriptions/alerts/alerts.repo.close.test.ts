import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { fakePolicy } from '@/modules/messaging/notification-rules/policy/policy.fakes';
import { AlertsRepo } from './alerts.repo';

const NOW = new Date('2026-10-02T09:00:00Z');

describe('AlertsRepo: the sweep reads open tasks once and closes chosen keys', () => {
  it('openTasks: the open subscription tasks, paged', async () => {
    const open = [{ subject_id: 'sub-1', dedup_key: 'renewal_due:sub-1' }];
    const { db, argsOf } = fakeDb({ admin_tasks: [{ data: open }] });
    expect(await new AlertsRepo(db, fakePolicy()).openTasks()).toEqual(open);
    expect(argsOf('admin_tasks', 'eq')).toEqual(['subject_type', 'subscription']);
    expect(argsOf('admin_tasks', 'is')).toEqual(['done_at', null]);
  });

  it('closeKeys: no keys → no write', async () => {
    const { db, trips } = fakeDb({});
    await new AlertsRepo(db, fakePolicy()).closeKeys([], NOW);
    expect(trips).toEqual([]);
  });

  it('closeKeys: closes the still-open tasks and fails their queued renewal message as stale', async () => {
    const closed = [{ dedup_key: 'renewal_due:sub-1' }];
    const { db, argsOf } = fakeDb({ admin_tasks: [{ data: closed }], messages: [{}] });
    await new AlertsRepo(db, fakePolicy()).closeKeys(['renewal_due:sub-1'], NOW);
    expect(argsOf('admin_tasks', 'update')).toEqual([{ done_at: '2026-10-02T09:00:00.000Z', done_by: null }]);
    expect(argsOf('admin_tasks', 'in')).toEqual(['dedup_key', ['renewal_due:sub-1']]);
    expect(argsOf('messages', 'update')).toEqual([expect.objectContaining({ status: 'failed', error_code: 'stale' })]);
    expect(argsOf('messages', 'in')).toEqual(['dedup_key', ['renewal_due:sub-1']]);
  });

  it('closeKeys: a db error is thrown', async () => {
    const { db } = fakeDb({ admin_tasks: [{ error: { message: 'boom' } }] });
    await expect(new AlertsRepo(db, fakePolicy()).closeKeys(['k'], NOW)).rejects.toThrow();
  });
});
