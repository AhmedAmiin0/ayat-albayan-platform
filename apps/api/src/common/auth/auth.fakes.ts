// Test helper (test-only, excluded from the build by *.fakes.ts): signed-in users by token, and
// booting the app.
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import type { TestingModuleBuilder } from '@nestjs/testing';
import {
  PERMISSION_RESOLVER,
  systemResolver,
  TOKEN_VERIFIER,
  type TokenVerifier,
} from './auth.guard';
import type { AuthUser } from './verify-token';

/** A verifier that knows these tokens (the token is the user's key) and refuses any other. */
const verifierOf =
  (users: Readonly<Record<string, AuthUser>>): TokenVerifier =>
  async (token) => {
    const user = users[token];
    if (!user) throw new Error('bad token');
    return user;
  };

/**
 * The module with these users and the system roles' permissions, compiled and listening in memory.
 */
export async function bootWith(
  builder: TestingModuleBuilder,
  users: Readonly<Record<string, AuthUser>>,
): Promise<NestFastifyApplication> {
  const mod = await builder
    .overrideProvider(PERMISSION_RESOLVER)
    .useValue(systemResolver)
    .overrideProvider(TOKEN_VERIFIER)
    .useValue(verifierOf(users))
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

export const ROLE_ADMIN = 'ad000000-0000-4000-8000-0000000000ad';
export const ROLE_SALES = 'sa000000-0000-4000-8000-0000000000a1';

/**
 * One signed-in user per system role, the token being the role (admin, sales, teacher, guardian,
 * assistant).
 */
export const ROLE_USERS: Readonly<Record<string, AuthUser>> = {
  admin: { id: ROLE_ADMIN, email: null, role: 'admin' },
  sales: { id: ROLE_SALES, email: null, role: 'sales' },
  teacher: { id: 'te000000-0000-4000-8000-0000000000e1', email: null, role: 'teacher' },
  guardian: { id: 'gu000000-0000-4000-8000-0000000000f1', email: null, role: 'guardian' },
  assistant: { id: 'as000000-0000-4000-8000-0000000000a5', email: null, role: 'assistant' },
};
