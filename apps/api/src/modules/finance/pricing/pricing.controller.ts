import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@/common/auth/decorators';
import { parseOrThrow } from '@/common/http/http';
import { ZodQuery } from '@/common/http/zod-inputs';
import { catalogQuery, listQuery, quoteQuery, type ListQuery } from './pricing.dto';
import { PricingService } from './pricing.service';

/** Staff price calculator (docs/08): the site's catalog and quotes, in the guardian's currency. */
@ApiTags('pricing')
@ApiBearerAuth()
@Permissions('pricing.read')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  /** GET /pricing/catalog?country=SA&duration=45 */
  @Get('catalog')
  catalog(@Query() query: unknown) {
    return this.pricing.catalog(parseOrThrow(catalogQuery, query));
  }

  /**
   * GET /pricing/quote?tier=bulk|count=20&duration=45&country=SA&students=2&discount=10
   * and rounding=nearest|up|down (left out: nearest).
   */
  @Get('quote')
  quote(@Query() query: unknown) {
    return this.pricing.quote(parseOrThrow(quoteQuery, query));
  }

  /** GET /pricing/list?country=SA&students=2&discount=10&rounding=down */
  @Get('list')
  list(@ZodQuery(listQuery) query: ListQuery) {
    return this.pricing.list(query);
  }
}
