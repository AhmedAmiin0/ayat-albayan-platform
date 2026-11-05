import { Controller, Get, Ip, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/auth/decorators';
import { ar } from '@/common/infra/i18n/server-text';
import { ZodParam } from '@/common/http/zod-inputs';
import { z } from 'zod';
import { ShortLinksLimit } from './short-links.limit';
import { ShortLinks } from './short-links.service';

/**
 * Any text: a code that cannot be ours is the same 404 page (ShortLinks.resolve checks its shape).
 */
const codeParam = z.string();

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
@ApiTags('short-links')
@Public()
@Controller('r')
export class ShortLinksController {
  constructor(
    private readonly links: ShortLinks,
    private readonly limit: ShortLinksLimit,
  ) {}

  @Get(':code')
  async go(
    @ZodParam('code', codeParam) code: string,
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
