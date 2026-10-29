import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../common/auth/auth.guard';
import { AuthModule } from '../../../common/auth/auth.module';
import type { PermissionResolver } from '../../../common/auth/permissions';
import { DB, DbModule } from '../../../common/db/db.module';
import { fakeDb } from '../../people/guardians/fake-db';
import { LeadFamilyController } from './lead-family.controller';
import { LeadFamilyService } from './lead-family.service';

const ID = '11111111-1111-4111-8111-111111111111';
const URL = `/leads/${ID}/link-family`;
const service = { link: vi.fn() };
const verify: TokenVerifier = async (token) => ({ id: `${token}-1`, email: null, role: token === 'granted' ? 'sales' : (token as 'admin' | 'sales' | 'teacher') });
// A custom sales role the admin granted leads.link_family (the system sales role does not hold it).
const resolver: PermissionResolver = async (user) =>
  user.id === 'granted-1' ? [...(await systemResolver(user)), 'leads.link_family' as const] : systemResolver(user);

describe('POST /leads/:id/link-family «ربط بطالب موجود» (leads.link_family)', () => {
  let app: NestFastifyApplication;
  const call = (token: string, payload: unknown) =>
    app.inject({ method: 'POST', url: URL, headers: { authorization: `Bearer ${token}` }, payload: payload as Record<string, unknown> });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [DbModule, AuthModule],
      controllers: [LeadFamilyController],
      providers: [{ provide: LeadFamilyService, useValue: service }],
    })
      .overrideProvider(DB)
      .useValue(fakeDb({}).db)
      .overrideProvider(PERMISSION_RESOLVER).useValue(resolver).overrideProvider(TOKEN_VERIFIER)
      .useValue(verify)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => service.link.mockReset().mockResolvedValue({ linked: true }));

  it('the admin links by code: 200 { linked } only, the code trimmed and upper-cased, the actor passed on', async () => {
    const res = await call('admin', { code: ' ab-0183 ' });
    expect([res.statusCode, res.json()]).toEqual([200, { linked: true }]);
    expect(service.link).toHaveBeenCalledWith({ leadId: ID, code: 'AB-0183', actorId: 'admin-1' });
  });

  it('the system sales role and a teacher → 403; a role granted leads.link_family passes', async () => {
    for (const token of ['sales', 'teacher']) expect((await call(token, { code: 'AB-0183' })).statusCode).toBe(403);
    expect(service.link).not.toHaveBeenCalled();
    expect((await call('granted', { code: 'AB-0183' })).statusCode).toBe(200);
  });

  it('a bad body or lead id → 400, the service is never called', async () => {
    for (const body of [{}, { code: 'AB-12' }, { code: 'AB-0183', guardian_id: 'g1' }]) {
      expect((await call('admin', body)).statusCode).toBe(400);
    }
    const res = await app.inject({ method: 'POST', url: '/leads/nope/link-family', headers: { authorization: 'Bearer admin' }, payload: { code: 'AB-0183' } });
    expect(res.statusCode).toBe(400);
    expect(service.link).not.toHaveBeenCalled();
  });
});
