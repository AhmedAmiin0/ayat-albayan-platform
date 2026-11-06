import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { TeacherJoin } from './join.service';
import { LegacyReportLinks } from './legacy.service';
import { LegacyReportLinkController, TeacherJoinController } from './lesson-links.controller';
import { LessonLinksLimit } from './lesson-links.limit';

const INVALID = 'هذا الرابط غير صالح أو انتهت صلاحيته.';

describe('GET /join/:token and GET /report-link/legacy/* (public)', () => {
  let app: NestFastifyApplication;
  const limit = { check: vi.fn(async () => undefined) };
  const join = {
    target: vi.fn(async (t: string) =>
      t === 'good' ? 'https://meet.google.com/abc-defg-hij' : null,
    ),
  };
  const legacy = {
    target: vi.fn(async (p: string) =>
      p.startsWith('teacher/') ? 'https://app.example/teacher-report/t' : null,
    ),
  };
  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [TeacherJoinController, LegacyReportLinkController],
    })
      .useMocker((token) =>
        new Map<unknown, unknown>([
          [TeacherJoin, join],
          [LegacyReportLinks, legacy],
          [LessonLinksLimit, limit],
        ]).get(token),
      )
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());

  it('/join: 302 to the lesson’s room, never cached; rate-limited', async () => {
    const res = await app.inject({ method: 'GET', url: '/join/good' });
    expect([res.statusCode, res.headers.location]).toEqual([
      302,
      'https://meet.google.com/abc-defg-hij',
    ]);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(limit.check).toHaveBeenCalledWith('join', { ip: expect.any(String), link: 'good' });
  });

  it('/join: an invalid or expired token is the Arabic «invalid link» page, no Location', async () => {
    const res = await app.inject({ method: 'GET', url: '/join/bad' });
    expect([res.statusCode, res.headers.location, res.body]).toEqual([404, undefined, INVALID]);
  });

  it('legacy: the raw path after the prefix (names still encoded), 302 or the invalid page', async () => {
    const name = encodeURIComponent('أبرار');
    const res = await app.inject({ method: 'GET', url: `/report-link/legacy/AB-0004/${name}/tok` });
    expect(legacy.target).toHaveBeenCalledWith(`AB-0004/${name}/tok`, expect.any(Date));
    expect([res.statusCode, res.body]).toEqual([404, INVALID]);
    const ok = await app.inject({ method: 'GET', url: '/report-link/legacy/teacher/report/x' });
    expect([ok.statusCode, ok.headers.location]).toEqual([
      302,
      'https://app.example/teacher-report/t',
    ]);
  });

  it('429 when the limit is full', async () => {
    const { HttpException } = await import('@nestjs/common');
    limit.check.mockRejectedValueOnce(new HttpException({ code: 'too_many_requests' }, 429));
    expect((await app.inject({ method: 'GET', url: '/join/good' })).statusCode).toBe(429);
  });
});
