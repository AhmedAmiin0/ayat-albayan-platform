import type { Permission } from '@ab/catalog';
import { defineRoute } from '@ab/core';
import { Controller } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { featureRoot } from '@/common/infra/test-root';
import { Route } from '@/common/http/route';
import { HealthModule } from '@/modules/platform/health';
import { PERMISSION_RESOLVER, TOKEN_VERIFIER, type TokenVerifier } from './auth.guard';
import type { PermissionResolver } from './permissions';

const response = z.object({ ok: z.string() });
const routes = {
  open: defineRoute({ method: 'GET', path: '/route-public-probe/open', response, isPublic: true }),
  guarded: defineRoute({
    method: 'GET',
    path: '/route-public-probe/guarded',
    response,
    permissions: ['payments.read'],
  }),
  bare: defineRoute({ method: 'GET', path: '/route-public-probe/bare', response }),
};

@Controller()
class RoutePublicProbeController {
  @Route(routes.open)
  open() {
    return { ok: 'open' };
  }

  @Route(routes.guarded)
  guarded() {
    return { ok: 'guarded' };
  }

  @Route(routes.bare)
  bare() {
    return { ok: 'bare' };
  }
}

const HELD: Readonly<Record<string, readonly Permission[]>> = {
  reader: ['payments.read'],
  other: ['students.read'],
};
const verify: TokenVerifier = async (token) => {
  if (!(token in HELD)) throw new Error('bad token');
  return { id: token, email: null, role: 'sales' };
};
const resolver: PermissionResolver = async (user) => HELD[user.id] ?? [];

let app: NestFastifyApplication;
beforeAll(async () => {
  const mod = await Test.createTestingModule({
    imports: [featureRoot(HealthModule)],
    controllers: [RoutePublicProbeController],
  })
    .overrideProvider(PERMISSION_RESOLVER).useValue(resolver)
    .overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .compile();
  app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});
afterAll(() => app.close());

const status = async (path: string, token?: string): Promise<number> => {
  const headers = token === undefined ? {} : { authorization: `Bearer ${token}` };
  return (await app.inject({ method: 'GET', url: `/route-public-probe/${path}`, headers }))
    .statusCode;
};

describe('AuthGuard with a route object that says isPublic', () => {
  it('lets an anonymous caller through', async () => {
    expect(await status('open')).toBe(200);
  });

  it('lets any token through, even one that does not verify', async () => {
    expect(await status('open', 'other')).toBe(200);
    expect(await status('open', 'forged')).toBe(200);
  });
});

describe('AuthGuard with a route object that does not say isPublic', () => {
  it('answers 401 to an anonymous caller', async () => {
    expect(await status('guarded')).toBe(401);
    expect(await status('bare')).toBe(401);
  });

  it('answers 401 to a token that does not verify', async () => {
    expect(await status('guarded', 'forged')).toBe(401);
  });

  it('answers 403 to a caller without the permission, 200 to one with it', async () => {
    expect(await status('guarded', 'other')).toBe(403);
    expect(await status('guarded', 'reader')).toBe(200);
  });

  it('refuses every caller on a route with neither isPublic nor permissions', async () => {
    expect(await status('bare', 'reader')).toBe(403);
  });
});
