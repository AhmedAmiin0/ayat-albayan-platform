import { describe, expect, it } from 'vitest';
import { adminTaskRoutes } from '../admin-tasks.routes';

const ID = '5a000000-0000-4000-8000-000000000001';
const task = {
  id: ID,
  kind: 'renewal_due',
  subject_type: 'subscription',
  subject_id: ID,
  student: { id: ID, code: 'AB-0001', name: 'Ali' },
  title: null,
  due_at: null,
  done_at: null,
  created_at: '2026-11-01T09:00:00Z',
};

describe('adminTaskRoutes (S7, S8)', () => {
  it('keeps the paths the api serves today', () => {
    const { list, done } = adminTaskRoutes;
    expect(`${list.method} ${list.path}`).toBe('GET /admin-tasks');
    expect(`${done.method} ${done.path}`).toBe('POST /admin-tasks/:id/done');
  });

  it('lists open tasks by default, 25 a page', () => {
    expect(adminTaskRoutes.list.query.parse({})).toEqual({ open: true, page: 1, pageSize: 25 });
    expect(adminTaskRoutes.list.query.parse({ open: 'false' })).toMatchObject({ open: false });
  });

  it('answers a page of tasks and the task marked done', () => {
    const page = { items: [task], total: 1, page: 1, pageSize: 25 };
    expect(adminTaskRoutes.list.response.parse(page)).toEqual(page);
    expect(adminTaskRoutes.done.response.parse(task)).toEqual(task);
  });

  it.each([
    ['an unknown kind', { ...task, kind: 'call_back' }],
    ['no created_at', { ...task, created_at: undefined }],
  ])('refuses a task with %s', (_name, answer) => {
    expect(adminTaskRoutes.done.response.safeParse(answer).success).toBe(false);
  });

  it('refuses an id that is not a uuid', () => {
    expect(adminTaskRoutes.done.params.safeParse({ id: 'x' }).success).toBe(false);
  });

  it('refuses an open flag that is not true or false', () => {
    expect(adminTaskRoutes.list.query.safeParse({ open: 'yes' }).success).toBe(false);
  });
});
