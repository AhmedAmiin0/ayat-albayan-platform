import type { Permission } from '@ab/catalog';
import { Controller, Get, SetMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { featureRoot } from '@/common/infra/test-root';
import { HealthModule } from '@/modules/platform/health';
import { PERMISSION_RESOLVER, TOKEN_VERIFIER, type TokenVerifier } from './auth.guard';
import { PERMISSION, Permissions } from './decorators';
import type { PermissionResolver } from './permissions';

@Controller('any-of-probe')
class AnyOfProbeController {
  @Get('one')
  @SetMetadata(PERMISSION, ['payments.read'])
  one() {
    return { ok: 'one' };
  }

  @Get('two')
  @SetMetadata(PERMISSION, ['payments.read', 'payments.write'])
  two() {
    return { ok: 'two' };
  }

  @Get('empty')
  @SetMetadata(PERMISSION, [])
  empty() {
    return { ok: 'empty' };
  }

  @Get('single')
  @Permissions('payments.read')
  single() {
    return { ok: 'single' };
  }
}

const HELD: Readonly<Record<string, readonly Permission[]>> = {
  reader: ['payments.read'],
  writer: ['payments.write'],
  both: ['payments.read', 'payments.write'],
  other: ['students.read'],
  none: [],
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
    controllers: [AnyOfProbeController],
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
  return (await app.inject({ method: 'GET', url: `/any-of-probe/${path}`, headers })).statusCode;
};

describe('AuthGuard with a list of permissions: any one lets a caller in', () => {
  it('admits a caller holding the one key of a one-key list, refuses one without it', async () => {
    expect(await status('one', 'reader')).toBe(200);
    expect(await status('one', 'writer')).toBe(403);
  });

  it('admits a caller holding only the second key of a two-key list', async () => {
    expect(await status('two', 'writer')).toBe(200);
    expect(await status('two', 'reader')).toBe(200);
    expect(await status('two', 'both')).toBe(200);
  });

  it('refuses with 403 a caller holding none of the listed keys', async () => {
    expect(await status('two', 'other')).toBe(403);
    expect(await status('two', 'none')).toBe(403);
  });

  it('refuses everyone on an empty list (fail closed)', async () => {
    expect(await status('empty', 'both')).toBe(403);
  });

  it('answers 401 before any permission check without a valid token', async () => {
    expect(await status('two')).toBe(401);
    expect(await status('two', 'forged')).toBe(401);
  });

  it('keeps the old single key form', async () => {
    expect(await status('single', 'reader')).toBe(200);
    expect(await status('single', 'writer')).toBe(403);
  });
});
