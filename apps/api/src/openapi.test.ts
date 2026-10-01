import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { buildOpenApi } from './openapi';

describe('OpenAPI document', () => {
  it('documents health and auth routes with bearer auth', async () => {
    process.env['SUPABASE_URL'] ??= 'http://127.0.0.1:54321';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    const doc = buildOpenApi(app);
    expect(Object.keys(doc.paths)).toEqual(expect.arrayContaining(['/health', '/auth/me']));
    expect(doc.components?.securitySchemes).toHaveProperty('bearer');
    await app.close();
  });
});
