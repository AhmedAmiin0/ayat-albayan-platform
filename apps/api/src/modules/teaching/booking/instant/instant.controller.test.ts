import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../../common/auth/auth.guard';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { InstantLessonService } from './instant.service';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'b0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const instant = { create: vi.fn() };
const BODY = {
  studentIds: ['00000000-0000-4000-8000-0000000000c1'],
  teacherId: '00000000-0000-4000-8000-0000000000b1',
  durationMin: 30,
};

describe('POST /lessons/instant', () => {
  let app: NestFastifyApplication;
  const post = (payload: object, token = 'admin') =>
    app.inject({ method: 'POST', url: '/lessons/instant', payload, headers: { authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(InstantLessonService).useValue(instant)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => instant.create.mockReset().mockResolvedValue({ lessonId: 'L1' }));

  it('201 { lessonId } for an admin, with the parsed body and the admin as actor', async () => {
    const res = await post(BODY);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ lessonId: 'L1' });
    expect(instant.create).toHaveBeenCalledWith({ req: BODY, actorId: USERS.admin?.id });
  });

  it('403 for a teacher', async () => {
    expect((await post(BODY, 'teacher')).statusCode).toBe(403);
    expect(instant.create).not.toHaveBeenCalled();
  });

  it('400 for no students or a duration outside DURATIONS', async () => {
    expect((await post({ ...BODY, studentIds: [] })).statusCode).toBe(400);
    expect((await post({ ...BODY, durationMin: 20 })).statusCode).toBe(400);
  });
});
