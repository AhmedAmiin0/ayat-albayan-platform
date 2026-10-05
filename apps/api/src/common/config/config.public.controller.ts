import type { PublicConfig } from '@ab/shared';
import { Controller, Get, Headers, HttpException, HttpStatus, Ip, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WindowCounter } from '../../modules/feedback/feedback.rate-limit';
import { Public } from '../auth/decorators';
import { etagOf } from './config.etag';
import { PublicConfigService } from './config.public.service';

/** The bit of the Fastify reply used here (no direct `fastify` dependency). */
interface CacheReply {
  header(name: string, value: string): CacheReply;
  code(status: number): unknown;
}

/** Browsers and CDNs may keep it a minute and serve a stale copy for five while they refetch. */
export const PUBLIC_CONFIG_CACHE = 'public, max-age=60, stale-while-revalidate=300';

/**
 * GET /config (no login): the public settings and public custom entries. Cacheable (ETag +
 * Cache-Control, 304 on a matching If-None-Match) and rate-limited per IP (120 per 10 minutes)
 * like the other public routes.
 */
@ApiTags('config')
@Public()
@Controller('config')
export class ConfigPublicController {
  private readonly perIp = new WindowCounter(120);

  constructor(private readonly config: PublicConfigService) {}

  @Get()
  async get(
    @Ip() ip: string,
    @Headers('if-none-match') match: string | undefined,
    @Res({ passthrough: true }) reply: CacheReply,
  ): Promise<PublicConfig | undefined> {
    if (!this.perIp.allow(ip, Date.now())) {
      throw new HttpException({ code: 'too_many_requests', message: 'too_many_requests' }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const body = await this.config.read();
    const etag = etagOf(body);
    reply.header('ETag', etag).header('Cache-Control', PUBLIC_CONFIG_CACHE);
    if (match === etag) {
      reply.code(HttpStatus.NOT_MODIFIED);
      return undefined;
    }
    return body;
  }
}
