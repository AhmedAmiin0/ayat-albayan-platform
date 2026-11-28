import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { messagingRoot } from '@/common/infra/test-root';
import { SignInModule } from '@/modules/people/sign-in';
import { ShortLinksAdminModule } from './short-links-admin.module';
import { AuditService } from '@/common/audit/audit.service';
import {
  PERMISSION_RESOLVER,
  systemResolver,
  TOKEN_VERIFIER,
  type TokenVerifier,
} from '@/common/auth/auth.guard';
import { DB } from '@/common/db/db.module';
import { RateLimitRepo } from '@/common/http/rate-limit.repo';
import { ResponseCheckInterceptor } from '@/common/http/returns';
import { fakeDb } from '@/common/db/testing/fake-db';
import { ShortLinks } from '@/modules/platform/short-links';
import { LinkTargets } from './managed/link-targets';
import { LinkUsersRepo } from './managed/link-users.repo';
import { LinkUsersSync } from './managed/link-users-sync';
import { ManagedLinksRepo } from './managed/managed-links.repo';
import { LinkPeopleRepo } from './people';
import { LinkSend } from './send/link-send';

export const SALES = '00000000-0000-4000-8000-0000000000b1';
export const OTHER_SALES = '00000000-0000-4000-8000-0000000000b2';
type Role = 'sales' | 'admin' | 'teacher' | 'guardian' | 'student';
const IDS: Record<Role, string> = {
  sales: SALES,
  admin: '00000000-0000-4000-8000-0000000000a1',
  teacher: '00000000-0000-4000-8000-0000000000c1',
  guardian: '00000000-0000-4000-8000-0000000000d1',
  student: '00000000-0000-4000-8000-0000000000e1',
};
const verify: TokenVerifier = async (token) => {
  await Promise.resolve();
  const role = (Object.keys(IDS) as Role[]).find((r) => r === token);
  if (!role) throw new Error('bad token');
  return { id: IDS[role], email: null, role };
};

const fakes = () => ({
  links: { byCode: vi.fn(), update: vi.fn(), insert: vi.fn(), page: vi.fn() },
  users: {
    users: vi.fn(async (): Promise<object[]> => []),
    visits: vi.fn(async (): Promise<object[]> => []),
    recordVisit: vi.fn(async () => 'recorded'),
    counts: vi.fn(),
  },
  people: {
    byIds: vi.fn(async () => []),
    phonesOf: vi.fn(async () => new Map<string, string>()),
    familyNames: vi.fn(async () => new Map<string, string>()),
  },
  targets: { base: vi.fn(async () => 'https://l.example/'), expiry: vi.fn() },
  sender: { sendAll: vi.fn(async () => ({ queued: 0, failed: 0 })) },
  sync: { replace: vi.fn() },
  audit: { record: vi.fn() },
  system: { row: vi.fn() },
});

/** The short-links test root with every repo, the send, the audit and the rate limit as vi.fn. */
export async function linksApp() {
  const f = fakes();
  const overrides: readonly (readonly [unknown, unknown])[] = [
    [PERMISSION_RESOLVER, systemResolver],
    [TOKEN_VERIFIER, verify],
    [DB, fakeDb({}).db],
    [RateLimitRepo, { takeOrThrow: vi.fn() }],
    [ManagedLinksRepo, f.links],
    [LinkUsersRepo, f.users],
    [LinkPeopleRepo, f.people],
    [LinkTargets, f.targets],
    [LinkSend, f.sender],
    [LinkUsersSync, f.sync],
    [AuditService, f.audit],
    [ShortLinks, f.system],
  ];
  const mod = await overrides
    .reduce(
      (b, [token, value]) => b.overrideProvider(token).useValue(value),
      Test.createTestingModule({ imports: [messagingRoot(ShortLinksAdminModule, SignInModule)] }),
    )
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useGlobalInterceptors(ResponseCheckInterceptor.fromEnv());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = (req: {
    method: 'GET' | 'PATCH' | 'POST';
    url: string;
    token: Role;
    payload?: object;
  }) =>
    app.inject({
      method: req.method,
      url: req.url,
      headers: { authorization: `Bearer ${req.token}` },
      ...(req.payload ? { payload: req.payload } : {}),
    });
  return { app, call, ...f };
}
