import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { fakePolicy } from '../notification-rules/policy.fakes';
import { AlertsQueries } from './alerts.queries';
import { toBalance } from './balance.queries';
import { cents, SubscriptionsQueries } from './subscriptions.queries';

describe('AlertsQueries: idempotent writes (rule 8)', () => {
  it('a task is insert … on conflict (dedup_key) do nothing', async () => {
    const { db, argsOf } = fakeDb({ admin_tasks: [{}] });
    const task = { kind: 'renewal_due' as const, subjectId: 'sub-1', dedupKey: 'renewal_due:sub-1', title: 'بقيت حلقتان' };
    await new AlertsQueries(db, fakePolicy()).raiseTask(task);
    expect(argsOf('admin_tasks', 'upsert')).toEqual([
      {
        kind: 'renewal_due',
        subject_type: 'subscription',
        subject_id: 'sub-1',
        dedup_key: 'renewal_due:sub-1',
        title: 'بقيت حلقتان',
      },
      { onConflict: 'dedup_key', ignoreDuplicates: true },
    ]);
  });

  it('stale tasks: open ones about the packages, except the keys still called for, are closed by the system', async () => {
    const { db, argsOf } = fakeDb({ admin_tasks: [{ data: [] }] });
    const now = new Date('2026-10-02T09:00:00Z');
    await new AlertsQueries(db, fakePolicy()).closeTasks({ subjectIds: ['sub-1', 'sub-2'], keep: ['renewal_due:sub-2'], now });
    expect(argsOf('admin_tasks', 'update')).toEqual([{ done_at: '2026-10-02T09:00:00.000Z', done_by: null }]);
    expect(argsOf('admin_tasks', 'in')).toEqual(['subject_id', ['sub-1', 'sub-2']]);
    expect(argsOf('admin_tasks', 'is')).toEqual(['done_at', null]);
    expect(argsOf('admin_tasks', 'not')).toEqual(['dedup_key', 'in', '("renewal_due:sub-2")']);
  });

  it('a renewal message still queued (or held auto_off) under a closed task is failed as stale (renewed meanwhile)', async () => {
    const { db, argsOf } = fakeDb({ admin_tasks: [{ data: [{ dedup_key: 'renewal_due:sub-1' }] }], messages: [{}] });
    await new AlertsQueries(db, fakePolicy()).closeTasks({ subjectIds: ['sub-1'], keep: [], now: new Date('2026-10-02T09:00:00Z') });
    expect(argsOf('messages', 'update')).toEqual([expect.objectContaining({ status: 'failed', error_code: 'stale' })]);
    expect(argsOf('messages', 'in')).toEqual(['dedup_key', ['renewal_due:sub-1']]);
    expect(argsOf('messages', 'or')).toEqual(['status.eq.queued,error_code.eq.auto_off']);
  });

  it.each([
    ['module mode, the renewal_due row off', fakePolicy({ mode: 'module', rows: [{ key: 'renewal_due', enabled: false }] })],
    ['rules unreadable (fail closed)', fakePolicy({ fail: true })],
  ])('%s: no renewal message queued', async (_name, policy) => {
    const { db, argsOf } = fakeDb({ messages: [{}] });
    const recipient = { studentName: 'سهيلة', guardianId: 'g1', phone: '+966500000001' };
    await new AlertsQueries(db, policy).queueRenewal({ recipient, params: {}, dedupKey: 'renewal_due:sub-1', now: new Date() });
    expect(argsOf('messages', 'upsert')).toBeUndefined();
  });

  it('the renewal message is a queued outbound renewal_due to the guardian, deduped', async () => {
    const { db, argsOf } = fakeDb({ messages: [{}] });
    const recipient = { studentName: 'سهيلة', guardianId: 'g1', phone: '+966500000001' };
    const now = new Date('2026-10-02T09:00:00Z');
    await new AlertsQueries(db, fakePolicy()).queueRenewal({ recipient, params: { '1': 'سهيلة' }, dedupKey: 'renewal_due:sub-1', now });
    expect(argsOf('messages', 'upsert')).toEqual([
      {
        direction: 'outbound',
        status: 'queued',
        phone_e164: '+966500000001',
        guardian_id: 'g1',
        template_key: 'renewal_due',
        template_params: { '1': 'سهيلة' },
        dedup_key: 'renewal_due:sub-1',
        scheduled_for: '2026-10-02T09:00:00.000Z',
      },
      { onConflict: 'dedup_key', ignoreDuplicates: true },
    ]);
  });

  it('recipient: the student name and the guardian phone; none without a guardian', async () => {
    const { db } = fakeDb({
      students: [{ data: { name: 'سهيلة', guardian: { id: 'g1', phone_e164: '+966500000001' } } }, { data: null }],
    });
    const q = new AlertsQueries(db, fakePolicy());
    expect(await q.recipient('s1')).toEqual({ studentName: 'سهيلة', guardianId: 'g1', phone: '+966500000001' });
    expect(await q.recipient('s2')).toBeNull();
  });

  it('students of lessons and with packages are distinct; no lessons → no query', async () => {
    const { db, calls } = fakeDb({
      lesson_students: [{ data: [{ student_id: 'a' }, { student_id: 'a' }, { student_id: 'b' }] }],
      subscriptions: [{ data: [{ student_id: 'a' }, { student_id: 'a' }] }],
    });
    const q = new AlertsQueries(db, fakePolicy());
    expect(await q.studentsOfLessons([])).toEqual([]);
    expect(calls).toHaveLength(0);
    expect(await q.studentsOfLessons(['l1'])).toEqual(['a', 'b']);
    expect(await q.studentsWithPackages()).toEqual(['a']);
  });
});

describe('balances and payments sums', () => {
  it('toBalance fills nullable view columns; a null id row is dropped', () => {
    const row = {
      subscription_id: 'sub-1', student_id: 's1', lessons_total: 4, lessons_used: null, remaining: 4,
      is_last: null, ended_at: null, projected_end_at: null,
    };
    expect(toBalance(row)).toMatchObject({ lessons_used: 0, remaining: 4, is_last: false });
    expect(toBalance({ ...row, subscription_id: null })).toBeNull();
  });

  it('paid sums only payments in the package currency, without float drift', async () => {
    const { db } = fakeDb({
      payments: [
        {
          data: [
            { subscription_id: 'a', amount: 0.1, currency: 'SAR' },
            { subscription_id: 'a', amount: 0.2, currency: 'SAR' },
            { subscription_id: 'a', amount: 50, currency: 'USD' },
          ],
        },
      ],
    });
    const paid = await new SubscriptionsQueries(db).paid([{ id: 'a', currency: 'SAR' }, { id: 'b', currency: 'EGP' }]);
    expect(paid).toEqual(new Map([['a', 0.3], ['b', 0]]));
    expect(cents(0.1, 0.2)).toBe(0.3);
  });
});
