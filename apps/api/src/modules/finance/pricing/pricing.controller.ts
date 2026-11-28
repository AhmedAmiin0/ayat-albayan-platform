import type { CatalogResponse, PriceListResponse, QuoteResponse } from '@ab/money';
import { pricingRoutes as routes, type PriceListPdfResponse } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { PriceListPdf } from './list-pdf';
import { PricingService } from './pricing.service';

/** Staff price calculator (docs/08): the site's catalog and quotes, in the guardian's currency. */
@ApiBearerAuth()
@Controller()
export class PricingController {
  constructor(
    private readonly pricing: PricingService,
    private readonly pdf: PriceListPdf,
  ) {}

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

  /** The same list as a PDF in the chat's file storage; the chat's file send then queues it. */
  @Route(routes.listPdf)
  @HttpCode(201)
  listPdf(
    @RouteInput() { body }: RouteInputOf<typeof routes.listPdf>,
    @CurrentUser() user: AuthUser,
  ): Promise<PriceListPdfResponse> {
    return this.pdf.create({ body, actorId: user.id });
  }
}
