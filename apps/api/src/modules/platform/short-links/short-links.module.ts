import { Module } from '@nestjs/common';
import { RateLimitRepo } from '@/common/http/rate-limit.repo';
import { ShortLinksController } from './short-links.controller';
import { ShortLinksLimit } from './short-links.limit';
import { ShortLinksRepo } from './short-links.repo';
import { ShortLinks } from './short-links.service';
import { ShortLinksSettings } from './short-links.settings';

/**
 * The in-house short links (docs/19 «Short links»): GET /r/:code and ShortLinks.forTarget for
 * producers.
 */
@Module({
  controllers: [ShortLinksController],
  providers: [RateLimitRepo, ShortLinksRepo, ShortLinksSettings, ShortLinksLimit, ShortLinks],
  exports: [ShortLinks],
})
export class ShortLinksModule {}
