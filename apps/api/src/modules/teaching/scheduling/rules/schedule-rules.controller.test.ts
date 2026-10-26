import { NotFoundException } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../../common/auth/auth.guard';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { conflict } from '../../../../common/http/errors';
import { RuleExtendService } from './rule-extend.service';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const ID = '00000000-0000-4000-8000-0000000000a1';
const extender = { extend: vi.fn() };

describe('POST /schedule-rules/:id/extend (docs/10 route 11, R-SCH-02)', () => {
  let app: NestFastifyApplication;
  const post = (token: string, payload?: object, id = ID) =>
    app.inject({ method: 'POST', url: `/schedule-rules/${id}/extend`, payload, headers: { authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER)
      .useValue(verify)
      .overrideProvider(RuleExtendService)
      .useValue(extender)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => vi.resetAllMocks());

  it('is admin-only: a teacher gets 403', async () => {
    expect((await post('teacher', {})).statusCode).toBe(403);
    expect(extender.extend).not.toHaveBeenCalled();
  });

  it('200 with the extend result; weeks optional (settings default)', async () => {
    const result = { rule_id: ID, until: '2026-11-06T10:00:00.000Z', inserted: 2, conflicts: [] };
    extender.extend.mockResolvedValue(result);
    const res = await post('admin');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(result);
    expect(extender.extend).toHaveBeenCalledWith({ ruleId: ID, weeks: undefined, actorId: USERS['admin']?.id });
    await post('admin', { weeks: 8 });
    expect(extender.extend).toHaveBeenLastCalledWith(expect.objectContaining({ weeks: 8 }));
  });

  it('400 for weeks outside 1..12 or a non-uuid id', async () => {
    expect((await post('admin', { weeks: 13 })).json()).toMatchObject({ message: 'validation_failed' });
    expect((await post('admin', {}, 'nope')).statusCode).toBe(400);
  });

  it('passes 404 / 409 rule_not_active through', async () => {
    extender.extend.mockRejectedValueOnce(new NotFoundException());
    expect((await post('admin', {})).statusCode).toBe(404);
    extender.extend.mockRejectedValueOnce(conflict('rule_not_active'));
    const res = await post('admin', {});
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ code: 'rule_not_active', message: 'rule_not_active' });
  });
});
