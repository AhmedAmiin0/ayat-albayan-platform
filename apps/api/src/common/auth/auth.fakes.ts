// Test helper (test-only, excluded from the build by *.fakes.ts): signed-in users by token, and booting the app.
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import type { TestingModuleBuilder } from '@nestjs/testing';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from './auth.guard';
import type { AuthUser } from './verify-token';

/** A verifier that knows these tokens (the token is the user's key) and refuses any other. */
const verifierOf =
  (users: Readonly<Record<string, AuthUser>>): TokenVerifier =>
  async (token) => {
    const user = users[token];
    if (!user) throw new Error('bad token');
    return user;
  };

/** The module with these users and the system roles' permissions, compiled and listening in memory. */
export async function bootWith(builder: TestingModuleBuilder, users: Readonly<Record<string, AuthUser>>): Promise<NestFastifyApplication> {
  const mod = await builder
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
    .overrideProvider(TOKEN_VERIFIER).useValue(verifierOf(users))
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
