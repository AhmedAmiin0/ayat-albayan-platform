import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { toTaskView } from './admin-tasks.queries';
import { STUDENT_ID, SUB_ID } from '../money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '../test-app';

const TASK_ID = '5a100000-0000-4000-8000-000000000001';
const row = {
  id: TASK_ID,
  kind: 'renewal_due' as const,
  subject_type: 'subscription',
  subject_id: SUB_ID,
  title: null,
  due_at: null,
  done_at: null,
  done_by: null,
  dedup_key: `renewal_due:${SUB_ID}`,
  created_at: '2026-10-02T09:00:00Z',
};

describe('admin tasks (S7, S8; R-SUB-02 «admin task»)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => resetMocks(m));

  it('S7: open tasks by default', async () => {
    m.tasks.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 });
    await call({ method: 'GET', url: '/admin-tasks' });
    expect(m.tasks.list).toHaveBeenCalledWith({ page: 1, pageSize: 25, open: true });
    await call({ method: 'GET', url: '/admin-tasks?open=false' });
    expect(m.tasks.list).toHaveBeenLastCalledWith({ page: 1, pageSize: 25, open: false });
  });

  it('S8: done is audited; 404 task_not_found; teachers refused', async () => {
    m.tasks.done.mockResolvedValue(toTaskView({ ...row, done_at: '2026-10-02T10:00:00Z' }, new Map()));
    const res = await call({ method: 'POST', url: `/admin-tasks/${TASK_ID}/done` });
    expect(res.statusCode).toBe(200);
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'admin_tasks', action: 'done' }));
    m.tasks.done.mockResolvedValue(null);
    expect((await call({ method: 'POST', url: `/admin-tasks/${TASK_ID}/done` })).json().code).toBe('task_not_found');
    expect((await call({ method: 'GET', url: '/admin-tasks', token: 'teacher' })).statusCode).toBe(403);
  });
});

describe('toTaskView', () => {
  it('a subscription task carries its student for the wording «باقة {student} …»', () => {
    const students = new Map([[SUB_ID, { id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة' }]]);
    expect(toTaskView(row, students)).toEqual({
      id: TASK_ID,
      kind: 'renewal_due',
      subject_type: 'subscription',
      subject_id: SUB_ID,
      student: { id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة' },
      title: null,
      due_at: null,
      done_at: null,
      created_at: '2026-10-02T09:00:00Z',
    });
    expect(toTaskView({ ...row, subject_type: 'lesson' }, students).student).toBeNull();
  });
});
