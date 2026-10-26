import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { AppModule } from '../../../app.module';
import { ActivityWriter } from '../../../common/activity/activity.writer';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../common/auth/auth.guard';
import type { AuthUser } from '../../../common/auth/verify-token';
import { fakeSettings } from '../../../common/settings/settings.fakes';
import { SettingsService } from '../../../common/settings/settings.service';
import { AvailabilityQueries } from './availability/availability.queries';
import { TeachersModule } from './teachers.module';
import { TeachersQueries } from './teachers.queries';

// teachers.meeting_mode (migration 490, owner 2026-10-19): only the admin sets it (teachers.write);
// every read returns the raw mode and what it resolves to under the academy default (ON here).

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  sales: { id: 's0000000-0000-4000-8000-000000000003', email: null, role: 'sales' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const teachers = { list: vi.fn(), get: vi.fn(), insert: vi.fn(), update: vi.fn(), remove: vi.fn(), idByProfile: vi.fn() };
const row = (meeting_mode: string | null) => ({ id: ID, display_name_ar: 'أ. سارة', meeting_link: null, meeting_mode });

describe('TeachersController — meeting_mode', () => {
  let app: NestFastifyApplication;
  let push: MockInstance<ActivityWriter['push']>;
  const call = (method: 'GET' | 'PATCH', url: string, opts: { body?: object; token?: string } = {}) =>
    app.inject({ method, url, payload: opts.body, headers: { authorization: `Bearer ${opts.token ?? 'admin'}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule, TeachersModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(TeachersQueries).useValue(teachers)
      .overrideProvider(AvailabilityQueries).useValue({})
      .overrideProvider(SettingsService).useValue(fakeSettings({ meeting_link_auto: true }))
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    push = vi.spyOn(app.get(ActivityWriter), 'push').mockImplementation(() => undefined);
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    push.mockImplementation(() => undefined);
  });

  it('GET list and detail: the raw mode and platform_classroom', async () => {
    teachers.list.mockResolvedValue({ items: [{ ...row(null), active_count: 0, trial_count: 0 }, row('static')], total: 2, page: 1, pageSize: 25 });
    const list = (await call('GET', '/teachers')).json();
    expect(list.items[0]).toMatchObject({ meeting_mode: null, platform_classroom: true });
    expect(list.items[1]).toMatchObject({ meeting_mode: 'static', platform_classroom: false });
    teachers.get.mockResolvedValue(row('platform'));
    expect((await call('GET', `/teachers/${ID}`)).json()).toMatchObject({ meeting_mode: 'platform', platform_classroom: true });
  });

  it('PATCH sets a mode or clears it back to the academy default, and is recorded in the activity log', async () => {
    teachers.update.mockImplementation(async (_id: string, patch: { meeting_mode: string | null }) => row(patch.meeting_mode));
    const res = await call('PATCH', `/teachers/${ID}`, { body: { meeting_mode: 'static' } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ meeting_mode: 'static', platform_classroom: false });
    expect(teachers.update).toHaveBeenCalledWith(ID, { meeting_mode: 'static' });
    expect(push).toHaveBeenCalledWith(expect.objectContaining({
      action: 'teachers.update', entity: 'teachers', entity_id: ID, status: 200, meta: { fields: ['meeting_mode'] },
    }));
    await call('PATCH', `/teachers/${ID}`, { body: { meeting_mode: null } });
    expect(teachers.update).toHaveBeenLastCalledWith(ID, { meeting_mode: null });
  });

  it('an unknown mode is 400 and nothing is written', async () => {
    const res = await call('PATCH', `/teachers/${ID}`, { body: { meeting_mode: 'zoom' } });
    expect(res.statusCode).toBe(400);
    expect(res.json().issues).toEqual([expect.objectContaining({ path: 'meeting_mode' })]);
    expect(teachers.update).not.toHaveBeenCalled();
  });

  it('sales and teachers cannot set it (403)', async () => {
    for (const token of ['sales', 'teacher']) {
      expect((await call('PATCH', `/teachers/${ID}`, { body: { meeting_mode: 'platform' }, token })).statusCode).toBe(403);
    }
    expect(teachers.update).not.toHaveBeenCalled();
  });
});
