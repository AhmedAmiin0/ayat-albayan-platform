import { Controller, Ip, Res } from '@nestjs/common';
import { Public } from '@/common/auth/decorators';
import { ar } from '@/common/infra/i18n/server-text';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { shortLinkRedirectRoutes as routes } from './short-links.routes';
import { ShortLinksLimit } from './short-links.limit';
import { ShortLinks } from './short-links.service';

/**
 * What the controller needs of Fastify's reply (passthrough: Nest still sends the returned body).
 */
interface Reply {
  status(code: number): unknown;
  header(name: string, value: string): unknown;
}

const noStore = (res: Reply): void => {
  res.header('Cache-Control', 'no-store');
  res.header('Referrer-Policy', 'no-referrer');
  res.header('X-Content-Type-Options', 'nosniff');
};

/**
 * GET /r/:code (no login, docs/19 «Short links»): 302 to the stored target, which only the server
 * writes (allow-listed: https on our origins or Google Meet). Unknown or expired → 404 with a short
 * Arabic text. Rate-limited per IP and code.
 */
@Public()
@Controller()
export class ShortLinksController {
  constructor(
    private readonly links: ShortLinks,
    private readonly limit: ShortLinksLimit,
  ) {}

  @Route(routes.go)
  async go(
    @RouteInput() { params: { code } }: RouteInputOf<typeof routes.go>,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Reply,
  ): Promise<string> {
    await this.limit.check(ip, code);
    const target = await this.links.resolve(code, new Date());
    noStore(res);
    if (!target) return this.missing(res);
    res.status(302);
    res.header('Location', target);
    return '';
  }

  private missing(res: Reply): string {
    res.status(404);
    res.header('Content-Type', 'text/plain; charset=utf-8');
    return ar.shortLinks.notFound;
  }
}
