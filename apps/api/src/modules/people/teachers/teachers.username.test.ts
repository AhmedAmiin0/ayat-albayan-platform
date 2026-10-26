import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../common/auth/auth.guard';
import { DB } from '../../../common/db/db.module';
import { fakeSettings } from '../../../common/settings/settings.fakes';
import { SettingsService } from '../../../common/settings/settings.service';
import { AvailabilityQueries } from './availability/availability.queries';
import { TeachersModule } from './teachers.module';
import { TeachersQueries } from './teachers.queries';

// A teacher's sign-in username (docs/30 §1, §7): read from and written to the teacher's login profile.

const verify: TokenVerifier = async (token) => {
  if (token !== 'admin') throw new Error('bad token');
  return { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' };
};
const ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const teachers = { list: vi.fn(), get: vi.fn(), insert: vi.fn(), update: vi.fn(), remove: vi.fn(), idByProfile: vi.fn() };
const row = (profile_id: string | null) => ({ id: ID, display_name_ar: 'أ. عمر', meeting_link: null, meeting_mode: null, profile_id });

/** profiles: `select … maybeSingle()` reads `stored`; `update(patch).eq()` resolves to `updateError`. */
const profiles = { stored: null as string | null, updateError: null as { code: string; message: string } | null, update: vi.fn() };
const db = {
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { username: profiles.stored }, error: null }) }) }),
    update: (patch: { username: string | null }) => {
      profiles.update(patch);
      return { eq: async () => ({ error: profiles.updateError }) };
    },
  }),
};

describe('TeachersController — username (docs/30)', () => {
  let app: NestFastifyApplication;
  const patch = (body: object) =>
    app.inject({ method: 'PATCH', url: `/teachers/${ID}`, payload: body, headers: { authorization: 'Bearer admin' } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule, TeachersModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(TeachersQueries).useValue(teachers)
      .overrideProvider(AvailabilityQueries).useValue({})
      .overrideProvider(SettingsService).useValue(fakeSettings())
      .overrideProvider(DB).useValue(db)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    Object.assign(profiles, { stored: 'ustadh.omar', updateError: null });
  });

  it('GET returns the login’s username, and null without a login', async () => {
    teachers.get.mockResolvedValue(row('p1'));
    const get = () => app.inject({ method: 'GET', url: `/teachers/${ID}`, headers: { authorization: 'Bearer admin' } });
    expect((await get()).json()).toMatchObject({ username: 'ustadh.omar' });
    teachers.get.mockResolvedValue(row(null));
    expect((await get()).json()).toMatchObject({ username: null });
  });

  it('PATCH writes the lower-cased username to the profile, not to the teacher row', async () => {
    teachers.get.mockResolvedValue(row('p1'));
    const res = await patch({ username: ' Ustadh.Omar ' });
    expect(res.statusCode).toBe(200);
    expect(profiles.update).toHaveBeenCalledWith({ username: 'ustadh.omar' });
    expect(teachers.update).not.toHaveBeenCalled();
    expect(res.json()).toMatchObject({ username: 'ustadh.omar' });
  });

  it('null clears it', async () => {
    teachers.get.mockResolvedValue(row('p1'));
    expect((await patch({ username: null })).statusCode).toBe(200);
    expect(profiles.update).toHaveBeenCalledWith({ username: null });
  });

  it('409 username_needs_login when the teacher has no login', async () => {
    teachers.get.mockResolvedValue(row(null));
    const res = await patch({ username: 'ustadh.omar' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'username_needs_login' });
    expect(profiles.update).not.toHaveBeenCalled();
  });

  it('409 username_taken when another profile has it', async () => {
    teachers.get.mockResolvedValue(row('p1'));
    profiles.updateError = { code: '23505', message: 'duplicate key' };
    const res = await patch({ username: 'ustadh.omar' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'username_taken' });
  });

  it('an invalid username is 400 and nothing is written', async () => {
    for (const bad of ['1omar', 'ab-1234', 'om', 'عمر']) {
      const res = await patch({ username: bad });
      expect(res.statusCode).toBe(400);
      expect(res.json().issues).toEqual([expect.objectContaining({ path: 'username' })]);
    }
    expect(profiles.update).not.toHaveBeenCalled();
  });

  it('a username together with other fields updates both', async () => {
    teachers.get.mockResolvedValue(row('p1'));
    teachers.update.mockResolvedValue(row('p1'));
    expect((await patch({ username: 'omar', meeting_link: null })).statusCode).toBe(200);
    expect(profiles.update).toHaveBeenCalledWith({ username: 'omar' });
    expect(teachers.update).toHaveBeenCalledWith(ID, { meeting_link: null });
  });
});
