import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '@/app.module';
import { bootWith } from '@/common/auth/auth.fakes';
import type { AuthUser } from '@/common/auth/verify-token';
import { LastSeenService } from './last-seen.service';
import { fakePresence } from './presence.fakes';
import { PresenceRepo } from './presence.repo';
import { PresenceSettings } from './presence.settings';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'p-ad', email: null, role: 'admin' },
  teacher: { id: 'p-t1', email: null, role: 'teacher' },
  guardian: { id: 'p-g', email: null, role: 'guardian' },
};

describe('GET /presence over HTTP', () => {
  const f = fakePresence();
  let app: Awaited<ReturnType<typeof bootWith>>;
  beforeAll(async () => {
    const builder = Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PresenceRepo)
      .useValue(f.repo)
      .overrideProvider(PresenceSettings)
      .useValue(f.settings);
    app = await bootWith(builder, USERS);
  });
  afterAll(() => app.close());
  const get = (url: string, who: string) =>
    app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${who}` } });

  it('the staff list: the admin only', async () => {
    const res = await get('/presence/staff', 'admin');
    expect([res.statusCode, res.json().staff.length]).toEqual([200, 3]);
    expect((await get('/presence/staff', 'teacher')).statusCode).toBe(403);
    expect((await get('/presence/staff', 'guardian')).statusCode).toBe(403);
  });

  it('/presence/me answers any signed-in user, and marks them seen', async () => {
    expect((await get('/presence/me', 'guardian')).json()).toEqual({ enabled: true });
    await app.get(LastSeenService).flush();
    expect(f.repo.touch).toHaveBeenCalledWith(expect.arrayContaining(['p-g']));
    expect((await app.inject({ method: 'GET', url: '/presence/me' })).statusCode).toBe(401);
  });
});
