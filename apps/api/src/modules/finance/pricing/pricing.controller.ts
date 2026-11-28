import type { CatalogResponse, PriceListResponse, QuoteResponse } from '@ab/money';
import { pricingRoutes as routes } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { PricingService } from './pricing.service';

/** Staff price calculator (docs/08): the site's catalog and quotes, in the guardian's currency. */
@ApiBearerAuth()
@Controller()
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Route(routes.catalog)
  catalog(@RouteInput() { query }: RouteInputOf<typeof routes.catalog>): Promise<CatalogResponse> {
    return this.pricing.catalog(query);
  }

  /** `tier` xor `count`; rounding nearest|up|down, left out: nearest. */
  @Route(routes.quote)
  quote(@RouteInput() { query }: RouteInputOf<typeof routes.quote>): Promise<QuoteResponse> {
    return this.pricing.quote(query);
  }

  @Route(routes.list)
  list(@RouteInput() { query }: RouteInputOf<typeof routes.list>): Promise<PriceListResponse> {
    return this.pricing.list(query);
  }
}
