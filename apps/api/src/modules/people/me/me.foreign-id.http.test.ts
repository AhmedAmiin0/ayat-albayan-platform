import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { featureRoot } from '@/common/infra/test-root';
import { MeModule } from './me.module';
import type { PermissionResolver } from '@/common/auth/permissions';
import {
  PERMISSION_RESOLVER,
  systemResolver,
  TOKEN_VERIFIER,
  type TokenVerifier,
} from '@/common/auth/auth.guard';
import { DB } from '@/common/db/db.module';
import { fakeDb, type FakeResult } from '@/common/db/testing/fake-db';

const ROLES = ['teacher', 'guardian', 'student', 'sales', 'admin'] as const;
const NO_PUSH = { id: 'nopush-1', email: null, role: 'teacher' as const, sessionId: 'sess-np' };
const verify: TokenVerifier = async (token) => {
  await Promise.resolve();
  if (token === 'nopush') return NO_PUSH;
  const role = ROLES.find((r) => r === token);
  if (!role) throw new Error('bad token');
  return { id: `${role}-1`, email: null, role, sessionId: `sess-${role}` };
};
const resolve: PermissionResolver = async (user) => {
  const held = await systemResolver(user);
  return user.id === NO_PUSH.id ? held.filter((p) => p !== 'notifications.push') : held;
};

const MINE = 'ExponentPushToken[mmmmmmmmmmmmmmmmmmmmmm]';
const OTHERS = 'ExponentPushToken[oooooooooooooooooooooo]';
const results: Record<string, FakeResult[]> = {};
const fake = fakeDb(results);
let app: NestFastifyApplication;

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [featureRoot(MeModule)] })
    .overrideProvider(PERMISSION_RESOLVER)
    .useValue(resolve)
    .overrideProvider(TOKEN_VERIFIER)
    .useValue(verify)
    .overrideProvider(DB)
    .useValue(fake.db)
    .compile();
  app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});
afterAll(() => app.close());
beforeEach(() => {
  fake.calls.length = 0;
  results.profiles = [{ data: { push_tokens: [MINE] } }];
});

const remove = (token: string) =>
  app.inject({
    method: 'DELETE',
    url: `/me/push-tokens/${encodeURIComponent(OTHERS)}`,
    headers: { authorization: `Bearer ${token}` },
  });
const argsOn = (table: string) =>
  fake.calls.filter((c) => c.table === table).map((c) => [c.method, ...c.args]);

// The route takes no person id: the token is only ever looked up on the caller's own profile.
describe("DELETE /me/push-tokens/:token with another person's device token", () => {
  it.each(ROLES)('%s: answers 204 and touches only their own profile and binding', async (role) => {
    const res = await remove(role);
    expect(res.statusCode).toBe(204);
    expect(argsOn('profiles')).toEqual([
      ['select', 'push_tokens'],
      ['eq', 'id', `${role}-1`],
      ['maybeSingle'],
    ]);
    expect(argsOn('push_device_sessions')).toEqual([
      ['delete'],
      ['eq', 'token', OTHERS],
      ['eq', 'profile_id', `${role}-1`],
    ]);
  });
});

describe('DELETE /me/push-tokens/:token without notifications.push', () => {
  it('answers 403 and reads or deletes nothing', async () => {
    const res = await remove('nopush');
    expect(res.statusCode).toBe(403);
    expect(fake.calls).toEqual([]);
  });
});
