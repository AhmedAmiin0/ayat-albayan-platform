import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { AdminTasksRepo } from '@/modules/finance/subscriptions/alerts/admin-tasks.repo';

interface Call { table: string; method: string; args: unknown[] }
const of = (calls: Call[], method: string) =>
  calls.filter((c) => c.method === method).map((c) => [c.table, ...c.args]);

const NOW = new Date('2026-11-23T10:00:00.000Z');
const task = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  kind: 'renewal_due',
  subject_type: 'subscription',
  subject_id: `sub-${id}`,
  title: 'باقة',
  due_at: null,
  done_at: null,
  created_at: '2026-11-01T00:00:00.000Z',
  ...over,
});
const view = (id: string, student: unknown, over: Record<string, unknown> = {}) => ({
  ...task(id, over),
  student,
});
const ali = { id: 'st1', code: 'AB-0001', name: 'علي' };

describe('AdminTasksRepo.list: one page of tasks, then their students in one trip', () => {
  it('open: done_at is null, newest first then id, page 2 as range 10..19, exact count', async () => {
    const rows = [task('t1'), task('t2', { subject_type: 'student', subject_id: 'st9' })];
    const { db, calls, trips } = fakeDb({
      admin_tasks: [{ data: rows, count: 12 }],
      subscriptions: [{ data: [{ id: 'sub-t1', student: ali }] }],
    });
    const out = await new AdminTasksRepo(db).list({ page: 2, pageSize: 10, open: true });
    expect(trips).toEqual(['admin_tasks', 'subscriptions']);
    expect(of(calls, 'select')).toEqual([
      ['admin_tasks', '*', { count: 'exact' }],
      ['subscriptions', 'id, student:students(id, code, name)'],
    ]);
    expect(of(calls, 'is')).toEqual([['admin_tasks', 'done_at', null]]);
    expect(of(calls, 'not')).toEqual([]);
    expect(of(calls, 'order')).toEqual([
      ['admin_tasks', 'created_at', { ascending: false }],
      ['admin_tasks', 'id'],
    ]);
    expect(of(calls, 'range')).toEqual([['admin_tasks', 10, 19]]);
    expect(of(calls, 'in')).toEqual([['subscriptions', 'id', ['sub-t1']]]);
    expect(out).toEqual({
      items: [view('t1', ali), view('t2', null, { subject_type: 'student', subject_id: 'st9' })],
      total: 12,
      page: 2,
      pageSize: 10,
    });
  });

  it('done: done_at is not null; no subscription task means no student trip; null count is 0', async () => {
    const row = task('t1', { subject_type: 'student', done_at: NOW.toISOString() });
    const { db, calls, trips } = fakeDb({ admin_tasks: [{ data: [row] }] });
    const out = await new AdminTasksRepo(db).list({ page: 1, pageSize: 25, open: false });
    expect(trips).toEqual(['admin_tasks']);
    expect(of(calls, 'not')).toEqual([['admin_tasks', 'done_at', 'is', null]]);
    expect(of(calls, 'is')).toEqual([]);
    expect(of(calls, 'range')).toEqual([['admin_tasks', 0, 24]]);
    expect(out.total).toBe(0);
  });

  it('a subscription without a student keeps the fallback ref of the task subject', async () => {
    const { db } = fakeDb({
      admin_tasks: [{ data: [task('t1')], count: 1 }],
      subscriptions: [{ data: [{ id: 'sub-t1', student: null }] }],
    });
    const out = await new AdminTasksRepo(db).list({ page: 1, pageSize: 25, open: true });
    expect(out.items[0]?.student).toBeNull();
  });

  it('a database error on the page or on the students is thrown', async () => {
    const boom = { code: 'XX000', message: 'boom' };
    const page = fakeDb({ admin_tasks: [{ error: boom }] });
    const q = { page: 1, pageSize: 25, open: true };
    await expect(new AdminTasksRepo(page.db).list(q)).rejects.toThrow('db error XX000: boom');
    const students = fakeDb({
      admin_tasks: [{ data: [task('t1')] }],
      subscriptions: [{ error: boom }],
    });
    await expect(new AdminTasksRepo(students.db).list(q)).rejects.toThrow('boom');
  });
});

describe('AdminTasksRepo.done: read by id, write only while still open', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('an open task: read, update done_at = now and done_by, then its student (3 trips)', async () => {
    const done = task('t1', { done_at: NOW.toISOString() });
    const { db, calls, trips } = fakeDb({
      admin_tasks: [{ data: task('t1') }, { data: done }],
      subscriptions: [{ data: [{ id: 'sub-t1', student: ali }] }],
    });
    const out = await new AdminTasksRepo(db).done('t1', 'admin1');
    expect(trips).toEqual(['admin_tasks', 'admin_tasks', 'subscriptions']);
    expect(of(calls, 'eq')).toEqual([['admin_tasks', 'id', 't1'], ['admin_tasks', 'id', 't1']]);
    expect(of(calls, 'update')).toEqual([
      ['admin_tasks', { done_at: NOW.toISOString(), done_by: 'admin1' }],
    ]);
    expect(of(calls, 'select')[1]).toEqual(['admin_tasks', '*']);
    expect(of(calls, 'maybeSingle')).toHaveLength(1);
    expect(of(calls, 'single')).toHaveLength(1);
    expect(out).toEqual(view('t1', ali, { done_at: NOW.toISOString() }));
  });

  it('an already done task keeps its first done_at: no update trip', async () => {
    const first = '2026-11-02T00:00:00.000Z';
    const row = task('t1', { subject_type: 'student', done_at: first });
    const { db, calls, trips } = fakeDb({ admin_tasks: [{ data: row }] });
    const out = await new AdminTasksRepo(db).done('t1', 'admin1');
    expect(trips).toEqual(['admin_tasks']);
    expect(of(calls, 'update')).toEqual([]);
    expect(out?.done_at).toBe(first);
  });

  it('an unknown id is null; a read or update error is thrown', async () => {
    const boom = { code: 'XX000', message: 'boom' };
    expect(await new AdminTasksRepo(fakeDb({}).db).done('nope', 'a')).toBeNull();
    const read = fakeDb({ admin_tasks: [{ error: boom }] });
    await expect(new AdminTasksRepo(read.db).done('t1', 'a')).rejects.toThrow('boom');
    const write = fakeDb({ admin_tasks: [{ data: task('t1') }, { error: boom }] });
    await expect(new AdminTasksRepo(write.db).done('t1', 'a')).rejects.toThrow('boom');
  });
});
