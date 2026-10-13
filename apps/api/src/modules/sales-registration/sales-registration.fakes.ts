// HTTP harness of the registration check (test-only, excluded from the build by *.fakes.ts).
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { PermissionResolver } from '../../common/auth/permissions';
import type { AuthUser } from '../../common/auth/verify-token';
import { SalesRegistrationQueries } from './sales-registration.queries';

const SALES_OFF = 'sa000000-0000-4000-8000-0000000000a2';
const USERS: Record<string, AuthUser> = {
  sales: { id: 'sa000000-0000-4000-8000-0000000000a1', email: null, role: 'sales' },
  salesOff: { id: SALES_OFF, email: null, role: 'sales' },
  admin: { id: 'ad000000-0000-4000-8000-0000000000ad', email: null, role: 'admin' },
  teacher: { id: 't1', email: null, role: 'teacher' },
  assistant: { id: 'as000000-0000-4000-8000-0000000000a5', email: null, role: 'assistant' },
};
export type Who = keyof typeof USERS;

/** `salesOff`: the sales role after the admin switched students.check_registration off in the matrix. */
const resolver: PermissionResolver = async (u) => {
  const all = await systemResolver(u);
  return u.id === SALES_OFF ? all.filter((p) => p !== 'students.check_registration') : all;
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

/** A DB row with secret columns present, so a test proves they never leave. */
export const row = (name: string, over: object = {}) =>
  ({ id: `id-${name}`, name, code: 'AB-0101', status: 'active', teacher_name: 'أبرار', phone_e164: '+966551110000', notes: 'سر', price: 290, ...over }) as never;

export async function registrationApp() {
  const queries = { byPhone: vi.fn(async () => []), byName: vi.fn(async () => []) };
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(resolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(SalesRegistrationQueries).useValue(queries)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const get = (url: string, token: Who) => app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });
  return { app, get, queries };
}
