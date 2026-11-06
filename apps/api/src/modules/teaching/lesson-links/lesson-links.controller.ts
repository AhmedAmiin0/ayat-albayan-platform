import { Controller, Get, Ip, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '@/common/auth/decorators';
import { ar } from '@/common/infra/i18n/server-text';
import { ZodParam } from '@/common/http/zod-inputs';
import { TeacherJoin } from './join.service';
import { LegacyReportLinks } from './legacy.service';
import { LessonLinksLimit } from './lesson-links.limit';

/** Any text: a token that is not ours is the same «invalid link» page. */
const tokenParam = z.string().max(100);
const LEGACY_PREFIX = '/report-link/legacy/';

/** What the controllers need of Fastify's reply (passthrough: Nest still sends the body). */
interface Reply {
  status(code: number): unknown;
  header(name: string, value: string): unknown;
}

const PRIVATE_HEADERS: readonly (readonly [string, string])[] = [
  ['Cache-Control', 'no-store'],
  ['Referrer-Policy', 'no-referrer'],
  ['X-Content-Type-Options', 'nosniff'],
];

/** 302 to the target, else 404 with the short Arabic «invalid link» text (as GET /r/:code). */
function answer(res: Reply, target: string | null): string {
  for (const [name, value] of PRIVATE_HEADERS) res.header(name, value);
  res.status(target ? 302 : 404);
  res.header(target ? 'Location' : 'Content-Type', target ?? 'text/plain; charset=utf-8');
  return target ? '' : ar.shortLinks.notFound;
}

/**
 * GET /join/:token (no login, owner 2026-11-06): teacher_lesson_v3's «ادخل الحلقة». A signed,
 * expiring token for one lesson → 302 to that lesson's own room (its stored link or our classroom
 * page). Invalid, expired or no longer the teacher's → the «invalid link» page. Rate-limited.
 */
@ApiTags('lesson-links')
@Public()
@Controller('join')
export class TeacherJoinController {
  constructor(
    private readonly join: TeacherJoin,
    private readonly limit: LessonLinksLimit,
  ) {}

  @Get(':token')
  async go(
    @ZodParam('token', tokenParam) token: string,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Reply,
  ): Promise<string> {
    await this.limit.check('join', { ip, link: token });
    return answer(res, await this.join.target(token, new Date()));
  }
}

/**
 * GET /report-link/legacy/* (no login, owner 2026-11-06): the old Vercel report redirector forwards
 * every /r/<path> here; one lesson's no-login report page, or the «invalid link» page.
 */
@ApiTags('lesson-links')
@Public()
@Controller('report-link/legacy')
export class LegacyReportLinkController {
  constructor(
    private readonly legacy: LegacyReportLinks,
    private readonly limit: LessonLinksLimit,
  ) {}

  /** The raw path (Fastify's wildcard is decoded once already: the parser decodes it itself). */
  @Get('*')
  async go(
    @Req() req: { url: string },
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Reply,
  ): Promise<string> {
    const path = req.url.startsWith(LEGACY_PREFIX) ? req.url.slice(LEGACY_PREFIX.length) : '';
    await this.limit.check('legacy', { ip, link: path.slice(0, 400) });
    return answer(res, await this.legacy.target(path, new Date()));
  }
}
