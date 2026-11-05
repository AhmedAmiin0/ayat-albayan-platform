import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShortLinksController } from './short-links.controller';
import { ShortLinksLimit } from './short-links.limit';
import { ShortLinks } from './short-links.service';

const NOW = Date.now();
const rows: Record<string, { target_url: string; expires_at: string | null }> = {
  Ab12Cd34Ef: { target_url: 'https://app.example.com/teacher-report/t', expires_at: null },
  Old12Cd34Ef: {
    target_url: 'https://app.example.com/x',
    expires_at: new Date(NOW - 1000).toISOString(),
  },
};

describe('GET /r/:code (public)', () => {
  let app: NestFastifyApplication;
  const limit = { check: vi.fn(async () => undefined) };
  beforeAll(async () => {
    const repo = { byCode: async (code: string) => rows[code] ?? null };
    const settings = { read: async () => ({ short_link_base: '' }) };
    const links = new ShortLinks(repo as never, settings as never);
    const mod = await Test.createTestingModule({ controllers: [ShortLinksController] })
      .useMocker((token) =>
        new Map<unknown, unknown>([
          [ShortLinks, links],
          [ShortLinksLimit, limit],
        ]).get(token),
      )
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => limit.check.mockClear());

  it('302 to the stored target, never cached; rate-limited per IP and code', async () => {
    const res = await app.inject({ method: 'GET', url: '/r/Ab12Cd34Ef' });
    expect([res.statusCode, res.headers.location]).toEqual([
      302,
      'https://app.example.com/teacher-report/t',
    ]);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(limit.check).toHaveBeenCalledWith(expect.any(String), 'Ab12Cd34Ef');
  });

  it('unknown, malformed or expired → 404 with a short Arabic text, no Location', async () => {
    for (const code of ['Zz99Zz99Zz', 'Old12Cd34Ef', 'bad']) {
      const res = await app.inject({ method: 'GET', url: `/r/${code}` });
      expect([res.statusCode, res.headers.location]).toEqual([404, undefined]);
      expect(res.body).toBe('هذا الرابط غير صالح أو انتهت صلاحيته.');
    }
  });

  it('429 when the limit is full', async () => {
    const { HttpException } = await import('@nestjs/common');
    limit.check.mockRejectedValueOnce(new HttpException({ code: 'too_many_requests' }, 429));
    expect((await app.inject({ method: 'GET', url: '/r/Ab12Cd34Ef' })).statusCode).toBe(429);
  });
});
