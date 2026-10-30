import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { STUDENT_ID } from '../../../finance/subscriptions/money/money.fakes';
import { moneyApp, resetMocks, SALES_A, type Mocks } from '../../../finance/subscriptions/test-app';
import { badRequest } from '../../../../common/http/errors';
import { CREATE, salesDefaults } from '../sales-money.fakes';
import { SalesMoney } from '../sales-money.service';
import { SalesTeacherAssign } from './sales-teacher-assign';

const TEACHER = '7a000000-0000-4000-8000-000000000001';

// «المعلم/ة» in the assistant's subscribe step (owner 2026-10-29): saved to students.teacher_id
// (assign_student_teacher: audit row, no-op when unchanged), only for her own student (self.sales_money).
describe('POST /sales/subscriptions with teacherId; GET /sales/subscriptions/teachers', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];
  let assign: MockInstance<SalesTeacherAssign['assign']>;
  let active: MockInstance<SalesTeacherAssign['ensureActive']>;
  let subscribe: MockInstance<SalesMoney['subscribe']>;

  beforeAll(async () => {
    ({ app, m, call } = await moneyApp());
    const service = app.get(SalesTeacherAssign);
    assign = vi.spyOn(service, 'assign').mockResolvedValue(true);
    vi.spyOn(service, 'options').mockResolvedValue([{ id: TEACHER, name: 'أبرار' }]);
    active = vi.spyOn(service, 'ensureActive').mockResolvedValue(undefined);
    subscribe = vi.spyOn(app.get(SalesMoney), 'subscribe');
  });
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
    assign.mockClear();
    subscribe.mockClear();
  });

  it('a teacher gone inactive: 400 teacher_not_found before any package is made', async () => {
    active.mockRejectedValueOnce(badRequest('teacher_not_found'));
    const res = await call({ method: 'POST', url: '/sales/subscriptions', token: 'salesA', body: { ...CREATE, teacherId: TEACHER } });
    expect([res.statusCode, res.json().code]).toEqual([400, 'teacher_not_found']);
    expect(subscribe).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('the package is made, then her pick is saved as the student’s teacher, she is the actor', async () => {
    const res = await call({ method: 'POST', url: '/sales/subscriptions', token: 'salesA', body: { ...CREATE, teacherId: TEACHER } });
    expect(res.statusCode).toBe(201);
    expect(assign).toHaveBeenCalledWith({ studentId: STUDENT_ID, teacherId: TEACHER, actorId: SALES_A.id });
  });

  it('no teacherId (an older app): the package only, the teacher stays', async () => {
    expect((await call({ method: 'POST', url: '/sales/subscriptions', token: 'salesA', body: CREATE })).statusCode).toBe(201);
    expect(assign).not.toHaveBeenCalled();
  });

  it('another assistant’s student: 403 not_your_student, nothing assigned; a bad id is 400', async () => {
    const res = await call({ method: 'POST', url: '/sales/subscriptions', token: 'salesB', body: { ...CREATE, teacherId: TEACHER } });
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_student']);
    expect((await call({ method: 'POST', url: '/sales/subscriptions', token: 'salesA', body: { ...CREATE, teacherId: 'x' } })).statusCode).toBe(400);
    expect(assign).not.toHaveBeenCalled();
  });

  it('the choices: the active teachers, names only; the subscribe permission guards them', async () => {
    const res = await call({ method: 'GET', url: '/sales/subscriptions/teachers', token: 'salesA' });
    expect([res.statusCode, res.json()]).toEqual([200, [{ id: TEACHER, name: 'أبرار' }]]);
    expect((await call({ method: 'GET', url: '/sales/subscriptions/teachers', token: 'teacher' })).statusCode).toBe(403);
  });
});
