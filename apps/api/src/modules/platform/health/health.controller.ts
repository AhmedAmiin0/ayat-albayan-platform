import { Controller, Get, Optional } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/auth/decorators';
import { SharedCache, type CacheStats } from '../../../common/cache/shared-cache';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Optional() private readonly cache?: SharedCache) {}

  /**
   * Liveness probe (R-NFR-07), plus the shared cache's mode (redis | memory), connection and hit rate.
   * Never touches Redis or the database: a down Redis keeps this 200 (the cache falls back to the DB).
   */
  @Public()
  @Get()
  check(): { status: 'ok'; cache?: CacheStats } {
    return this.cache ? { status: 'ok', cache: this.cache.stats() } : { status: 'ok' };
  }
}
