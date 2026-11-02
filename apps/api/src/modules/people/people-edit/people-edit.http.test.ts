import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, mocks, peopleApp } from '@/modules/people/people-edit/testing/people-edit.test-app';

const S = '11111111-1111-4111-8111-111111111111';
const G = '22222222-2222-4222-8222-222222222222';

const ROUTES = [
  { method: 'GET', url: `/people/students/${S}` },
  { method: 'PATCH', url: `/people/students/${S}`, payload: { name: 'سهيلة' } },
  { method: 'PATCH', url: `/people/guardians/${G}`, payload: { notes: 'ملاحظة' } },
  { method: 'DELETE', url: `/people/guardians/${G}/phones/%2B201000000002` },
  { method: 'GET', url: '/people/guardians?search=AB-0183' },
  { method: 'POST', url: `/people/students/${S}/guardian`, payload: { guardian_id: G } },
  {
    method: 'PATCH',
    url: `/people/students/${S}/contact-self`,
    payload: { contact_is_self: true },
  },
  { method: 'POST', url: `/people/guardians/${G}/to-student` },
  { method: 'POST', url: `/people/students/${S}/to-guardian` },
] as const;

describe('/people/* (people.edit, students.attach_guardian, people.switch_role)', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    app = await peopleApp();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.views.view.mockResolvedValue({ student: { id: S }, guardian: { id: G } });
    mocks.people.editStudent.mockResolvedValue({ id: S });
    mocks.people.editGuardian.mockResolvedValue({ id: G });
    mocks.phones.removeSecond.mockResolvedValue(undefined);
    mocks.families.families.mockResolvedValue([]);
    mocks.families.move.mockResolvedValue({ student_id: S, guardian_id: G });
    mocks.roles.setSelf.mockResolvedValue({ id: S, contact_is_self: true });
    mocks.roles.guardianToStudent.mockResolvedValue({ id: S, code: 'AB-0200' });
    mocks.roles.studentToGuardian.mockResolvedValue({ guardian_id: G });
  });

  it.each(['admin', 'sales'])('%s reaches every route', async (token) => {
    for (const route of ROUTES) {
      const res = await call(app, { ...route, token });
      expect([route.url, res.statusCode]).toEqual([
        route.url,
        expect.toSatisfy((c: number) => c < 300),
      ]);
    }
  });

  it.each(['teacher', 'assistant', 'guardian', 'student', 'sales-off'])(
    '%s is refused everywhere (403)',
    async (token) => {
      for (const route of ROUTES)
        expect((await call(app, { ...route, token })).statusCode).toBe(403);
      const called = Object.values(mocks).flatMap((m) => Object.values(m));
      expect(called.filter((fn) => fn.mock.calls.length > 0)).toEqual([]);
    },
  );

  it('no token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: `/people/students/${S}` });
    expect(res.statusCode).toBe(401);
  });

  it('passes the actor and the parsed body on', async () => {
    await call(app, {
      method: 'PATCH',
      url: `/people/students/${S}`,
      token: 'sales',
      payload: { name: ' سهيلة ', notes: '' },
    });
    expect(mocks.people.editStudent).toHaveBeenCalledWith({
      id: S,
      patch: { name: 'سهيلة', notes: null },
      actorId: 'sales-1',
    });
    await call(app, {
      method: 'POST',
      url: `/people/students/${S}/guardian`,
      token: 'sales',
      payload: { guardian_id: G },
    });
    expect(mocks.families.move).toHaveBeenCalledWith({
      studentId: S,
      move: { kind: 'existing', id: G },
      actorId: 'sales-1',
    });
    const res = await call(app, {
      method: 'DELETE',
      url: `/people/guardians/${G}/phones/%2B201000000002`,
      token: 'sales',
    });
    expect(res.statusCode).toBe(204);
    expect(mocks.phones.removeSecond).toHaveBeenCalledWith({
      guardianId: G,
      phone: '+201000000002',
      actorId: 'sales-1',
    });
  });
});
