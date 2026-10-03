import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { TeachersQueries } from '../teachers/teachers.queries';
import { ADMIN, GUARDIAN, OTHER, OTHER_ID, student, TEACHER, TEACHER_ID, lesson } from './teacher-students.fakes';
import { TeacherStudentsQueries } from './teacher-students.queries';

const USERS: Record<string, AuthUser> = { admin: ADMIN, teacher: TEACHER, other: OTHER, guardian: GUARDIAN };
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

describe('GET /teachers/me/students?kind= (teacher tab «الطلاب», R-TCH-03)', () => {
  const teachers = { idByProfile: vi.fn() };
  const q = { assigned: vi.fn(), lessons: vi.fn(), byIds: vi.fn() };
  let app: NestFastifyApplication;
  const get = (url: string, token = 'teacher') =>
    app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(TeachersQueries).useValue(teachers)
      .overrideProvider(TeacherStudentsQueries).useValue(q)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    teachers.idByProfile.mockImplementation(async (id: string) => (id === TEACHER.id ? TEACHER_ID : id === OTHER.id ? OTHER_ID : null));
    q.assigned.mockImplementation(async ({ teacherId }: { teacherId: string }) =>
      teacherId === TEACHER_ID ? [student({})] : [student({ id: 'x9', name: 'غريب' })],
    );
    q.lessons.mockResolvedValue([lesson({ students: ['s1', 's7'] })]);
    q.byIds.mockResolvedValue([student({ id: 's7', name: 'بلال', status: 'active' })]);
  });

  it('subscribed = status active: mine plus those on my lessons, merged and by name', async () => {
    const res = await get('/teachers/me/students?kind=subscribed');
    expect(res.statusCode).toBe(200);
    expect(q.assigned).toHaveBeenCalledWith({ teacherId: TEACHER_ID, status: 'active' });
    expect(q.byIds).toHaveBeenCalledWith({ ids: ['s7'], status: 'active' });
    expect(res.json().map((s: { id: string }) => s.id)).toEqual(['s7', 's1']);
  });

  it('trial asks only for status trial', async () => {
    await get('/teachers/me/students?kind=trial');
    expect(q.assigned).toHaveBeenCalledWith({ teacherId: TEACHER_ID, status: 'trial' });
    expect(q.byIds).toHaveBeenCalledWith(expect.objectContaining({ status: 'trial' }));
  });

  it("another teacher gets only their own: the id comes from the login, a teacherId param is ignored", async () => {
    const res = await get(`/teachers/me/students?kind=subscribed&teacherId=${TEACHER_ID}`, 'other');
    expect(q.assigned).toHaveBeenCalledWith({ teacherId: OTHER_ID, status: 'active' });
    expect(q.lessons).toHaveBeenCalledWith(expect.objectContaining({ teacherId: OTHER_ID }));
    expect(res.json().map((s: { id: string }) => s.id)).toContain('x9');
    expect(res.json().map((s: { id: string }) => s.id)).not.toContain('s1');
  });

  it('no phone, guardian or money anywhere in the payload', async () => {
    q.assigned.mockResolvedValue([{ ...student({}), phone_e164: '+966500000000', guardian_id: 'g1', price: 10 }]);
    const text = (await get('/teachers/me/students?kind=subscribed')).body;
    expect(text).not.toMatch(/phone|guardian|price|\+966/);
    expect(Object.keys(JSON.parse(text)[0]).sort()).toEqual(
      ['age', 'code', 'id', 'level', 'name', 'next_lesson_at', 'program', 'status'],
    );
  });

  it('teacher only; kind required and validated; a login without a teachers row is 404', async () => {
    expect((await get('/teachers/me/students?kind=subscribed', 'admin')).statusCode).toBe(403);
    expect((await get('/teachers/me/students?kind=subscribed', 'guardian')).statusCode).toBe(403);
    expect((await get('/teachers/me/students')).statusCode).toBe(400);
    expect((await get('/teachers/me/students?kind=all')).statusCode).toBe(400);
    teachers.idByProfile.mockResolvedValue(null);
    expect((await get('/teachers/me/students?kind=trial')).statusCode).toBe(404);
  });
});
