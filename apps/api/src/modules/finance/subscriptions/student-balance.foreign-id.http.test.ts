import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { TestingModuleBuilder } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { systemResolver } from '@/common/auth/auth.guard';
import { fakeDb, type FakeResult } from '@/modules/people/guardians/fake-db';
import type { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import { STUDENT_ID, subRow } from './money/money.fakes';
import { StudentAccess } from './student-lifecycle/student-access';
import { moneyApp, resetMocks, TEACHER, type Mocks } from './test-app';

const MY_TEACHER_ID = 't-mine';
const url = `/students/${STUDENT_ID}/balance`;

describe('GET /students/:id/balance with another teacher’s student id', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];
  const liveDb = fakeDb({}).db;
  const teachers = {
    idByProfile: vi.fn(async (id: string) => (id === TEACHER.id ? MY_TEACHER_ID : null)),
  };
  const realAccess = new StudentAccess(liveDb, teachers as unknown as TeachersRepo);
  const useDb = (results: Record<string, FakeResult[]>): void => {
    Object.assign(liveDb, fakeDb(results).db);
  };
  const student = (teacherId: string | null): Record<string, FakeResult[]> => ({
    students: [{ data: { id: STUDENT_ID, teacher_id: teacherId } }],
    'rpc:teacher_has_student': [{ data: false }],
  });

  beforeAll(async () => {
    const withRealAccess = (b: TestingModuleBuilder) =>
      b.overrideProvider(StudentAccess).useValue(realAccess);
    ({ app, m, call } = await moneyApp(systemResolver, withRealAccess));
  });
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.subs.forStudent.mockResolvedValue([subRow({ status: 'active' })]);
  });

  it('another teacher’s student is 403 and no package is read', async () => {
    useDb(student('t-other'));
    const res = await call({ method: 'GET', url, token: 'teacher' });
    expect(res.statusCode).toBe(403);
    expect(m.subs.forStudent).not.toHaveBeenCalled();
    expect(res.body).not.toContain(STUDENT_ID);
  });

  it('an unknown student is 404 and no package is read', async () => {
    useDb({ students: [{ data: null }] });
    const res = await call({ method: 'GET', url, token: 'teacher' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'student_not_found']);
    expect(m.subs.forStudent).not.toHaveBeenCalled();
  });

  it('the student’s own teacher and the admin still read the balance', async () => {
    useDb(student(MY_TEACHER_ID));
    expect((await call({ method: 'GET', url, token: 'teacher' })).statusCode).toBe(200);
    useDb(student('t-other'));
    expect((await call({ method: 'GET', url })).statusCode).toBe(200);
  });
});
