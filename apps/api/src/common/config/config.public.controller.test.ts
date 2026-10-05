import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { TOKEN_VERIFIER } from '../auth/auth.guard';
import { PublicConfigService } from './config.public.service';

const service = { read: vi.fn() };
const BODY = { settings: { academy_contact: { site: 'x.org' }, recording_consent_notice: null }, custom: { promo: 'hi' } };

describe('GET /config (public)', () => {
  let app: NestFastifyApplication;
  const get = (headers: Record<string, string> = {}) => app.inject({ method: 'GET', url: '/config', headers });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER).useValue(async () => { throw new Error('no token expected'); })
      .overrideProvider(PublicConfigService).useValue(service)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    service.read.mockReset();
    service.read.mockResolvedValue(BODY);
  });

  it('needs no login and returns the whitelisted body with cache headers', async () => {
    const res = await get();
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(BODY);
    expect(res.headers['cache-control']).toBe('public, max-age=60, stale-while-revalidate=300');
    expect(res.headers.etag).toMatch(/^W\/"[0-9a-f]{20}"$/);
  });

  it('answers 304 to a matching If-None-Match, and a new tag when the content changes', async () => {
    const first = await get();
    const etag = String(first.headers.etag);
    const again = await get({ 'if-none-match': etag });
    expect(again.statusCode).toBe(304);
    expect(again.body).toBe('');
    service.read.mockResolvedValue({ ...BODY, custom: {} });
    const changed = await get({ 'if-none-match': etag });
    expect(changed.statusCode).toBe(200);
    expect(changed.headers.etag).not.toBe(etag);
  });
});
