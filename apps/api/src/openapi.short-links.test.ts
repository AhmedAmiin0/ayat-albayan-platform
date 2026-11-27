import { shortLinkRoutes } from '@ab/shared';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppModule } from './app.module';
import { buildOpenApi } from './openapi';

const operationSchema = z.object({ tags: z.array(z.string()).default([]) });
const pathItemSchema = z.record(z.string(), operationSchema.optional());

const openApiPath = (path: string): string => path.replace(/:(\w+)/g, '{$1}');

// The pilot moved @ApiTags from the class onto its route objects: each operation keeps its tags.
describe('OpenAPI tags of the managed short links', () => {
  it('keeps the same tags on every operation', async () => {
    process.env.SUPABASE_URL ??= 'http://127.0.0.1:54321';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    const { paths } = buildOpenApi(app);
    await app.close();
    const tags = Object.values(shortLinkRoutes).map(({ method, path }) => {
      const item = pathItemSchema.parse(paths[openApiPath(path)] ?? {});
      return `${method} ${path} ${item[method.toLowerCase()]?.tags.join(',') ?? 'missing'}`;
    });
    expect(tags.sort()).toEqual([
      'GET /short-links short-links',
      'GET /short-links/:code short-links',
      'GET /short-links/people short-links',
      'PATCH /short-links/:code short-links',
      'POST /short-links short-links',
      'POST /short-links/:code/resend short-links',
      'POST /short-links/:code/revoke short-links',
    ]);
  }, 60_000);
});
