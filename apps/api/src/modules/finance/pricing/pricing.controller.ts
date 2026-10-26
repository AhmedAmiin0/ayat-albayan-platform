import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../../common/auth/decorators';
import { parseOr400 } from '../../sales/leads/http';
import { catalogQuery, quoteQuery } from './pricing.dto';
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
    return this.pricing.catalog(parseOr400(catalogQuery, query));
  }

  /** GET /pricing/quote?tier=bulk|count=20&duration=45&country=SA&students=2&discount=10 */
  @Get('quote')
  quote(@Query() query: unknown) {
    return this.pricing.quote(parseOr400(quoteQuery, query));
  }
}
