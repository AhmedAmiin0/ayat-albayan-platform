import { Controller, Ip, Req, Res } from '@nestjs/common';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { answerLink, lessonLinkRoutes as routes, type LinkReply } from './http';
import { TeacherJoin } from './join.service';
import { LegacyReportLinks } from './legacy.service';
import { LessonLinksLimit } from './lesson-links.limit';

const LEGACY_PREFIX = '/report-link/legacy/';

/** Signed expiring token for one lesson redirects to its room; invalid shows an error page. */
@Controller()
export class TeacherJoinController {
  constructor(
    private readonly join: TeacherJoin,
    private readonly limit: LessonLinksLimit,
  ) {}

  @Route(routes.join)
  async go(
    @RouteInput() { params }: RouteInputOf<typeof routes.join>,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: LinkReply,
  ): Promise<string> {
    await this.limit.check('join', { ip, link: params.token });
    return answerLink(res, await this.join.target(params.token, new Date()));
  }
}

/**
 * GET /report-link/legacy/* (no login): the old Vercel report redirector forwards
 * every /r/<path> here; one lesson's no-login report page, or the «invalid link» page.
 */
@Controller()
export class LegacyReportLinkController {
  constructor(
    private readonly legacy: LegacyReportLinks,
    private readonly limit: LessonLinksLimit,
  ) {}

  /** The raw path (Fastify's wildcard is decoded once already: the parser decodes it itself). */
  @Route(routes.legacyReport)
  async go(
    @Req() req: { url: string },
    @Ip() ip: string,
    @Res({ passthrough: true }) res: LinkReply,
  ): Promise<string> {
    const path = req.url.startsWith(LEGACY_PREFIX) ? req.url.slice(LEGACY_PREFIX.length) : '';
    await this.limit.check('legacy', { ip, link: path.slice(0, 400) });
    return answerLink(res, await this.legacy.target(path, new Date()));
  }
}
