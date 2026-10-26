// HTTP test harness for /config/entries and /admin/config/parity (test-only). Real controllers, guards,
// service, mapper and ownership; ConfigStore and the audit are fakes.
import type { Permission } from '@ab/shared';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { AuditService } from '../../audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../auth/auth.guard';
import type { PermissionResolver } from '../../auth/permissions';
import type { AuthUser } from '../../auth/verify-token';
import { fakeConfigStore } from '../config-store.fakes';
import { ConfigStore } from '../store/config-store.service';

export const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
  // Custom roles on a non-admin base: «القيم» editors, one of them also holding numbers.manage.
  editor: { id: 'e0000000-0000-4000-8000-000000000003', email: null, role: 'sales' },
  numbers: { id: 'n0000000-0000-4000-8000-000000000004', email: null, role: 'sales' },
};
export type Token = keyof typeof USERS;

const EXTRA: Partial<Record<string, Permission[]>> = {
  [USERS['editor']?.id ?? '']: ['settings.read', 'settings.write'],
  [USERS['numbers']?.id ?? '']: ['settings.read', 'settings.write', 'numbers.manage'],
};
const resolver: PermissionResolver = async (user) => EXTRA[user.id] ?? systemResolver(user);
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

export interface Call {
  method: 'GET' | 'PATCH' | 'PUT';
  url: string;
  token?: Token;
  body?: object;
}

/** Boots AppModule over a fake ConfigStore (mutable rows) and a fake audit. */
export async function configEntriesApp() {
  const store = fakeConfigStore();
  const audit = { record: vi.fn(async () => undefined) };
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(resolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(ConfigStore).useValue(store)
    .overrideProvider(AuditService).useValue(audit)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = ({ method, url, token = 'admin', body }: Call) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, payload: body });
  return { app, store, audit, call };
}
