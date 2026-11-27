import { NotFoundException } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messagingRoot } from '@/common/infra/test-root';
import { RateLimitRepo } from '@/common/http/rate-limit.repo';
import { PERMISSION_RESOLVER, systemResolver } from '@/common/auth/auth.guard';
import { ReportPageModule } from '@/modules/reporting/report-page/report-page.module';
import { PUBLIC_ID } from '@/modules/reporting/report-page/report-page.fakes';
import { ReportCodeService } from './report-code.service';

const BASE = `/public/report-pages/${PUBLIC_ID}`;

describe('the report page code gate over HTTP (no login)', () => {
  const codes = { view: vi.fn(), access: vi.fn(), request: vi.fn(), verify: vi.fn() };
  let app: NestFastifyApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [messagingRoot(ReportPageModule)] })
      .overrideProvider(PERMISSION_RESOLVER)
      .useValue(systemResolver)
      .overrideProvider(ReportCodeService)
      .useValue(codes)
      .overrideProvider(RateLimitRepo)
      .useValue({ takeOrThrow: vi.fn() })
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => vi.resetAllMocks());

  it('the masked numbers, never cached', async () => {
    codes.access.mockResolvedValue({ available: true, to: [{ to: 'family', masked: '••••01' }] });
    const res = await app.inject({ method: 'GET', url: `${BASE}/access` });
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(codes.access).toHaveBeenCalledWith(PUBLIC_ID);
  });

  it('a malformed public id is refused before any lookup', async () => {
    const res = await app.inject({ method: 'GET', url: '/public/report-pages/NOT-HEX/access' });
    expect(res.statusCode).toBe(400);
    expect(codes.access).not.toHaveBeenCalled();
  });

  it('the code goes only to a number on file: 202, a typed number is 400', async () => {
    const ok = await app.inject({ method: 'POST', url: `${BASE}/code`, payload: { to: 'family' } });
    expect(ok.statusCode).toBe(202);
    expect(codes.request.mock.calls[0]?.[0]).toMatchObject({ publicId: PUBLIC_ID, to: 'family' });
    const bad = await app.inject({ method: 'POST', url: `${BASE}/code`, payload: { to: '+1555' } });
    expect(bad.statusCode).toBe(400);
  });

  it('a verified code sets the report cookie; the typed digits are folded', async () => {
    codes.verify.mockResolvedValue('ab_report=t; Path=/');
    const res = await app.inject({
      method: 'POST',
      url: `${BASE}/verify`,
      payload: { code: '١٢٣ ٤٥٦' },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers['set-cookie']).toBe('ab_report=t; Path=/');
    expect(codes.verify.mock.calls[0]?.[0]).toMatchObject({ publicId: PUBLIC_ID, code: '123456' });
  });

  it('the page reads the cookie the browser sent', async () => {
    codes.view.mockRejectedValue(new NotFoundException());
    await app.inject({ method: 'GET', url: BASE, headers: { cookie: 'ab_report=t' } });
    expect(codes.view).toHaveBeenCalledWith({ publicId: PUBLIC_ID, cookie: 'ab_report=t' });
  });
});
