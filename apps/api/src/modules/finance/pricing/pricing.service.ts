import {
  currencyForCountry,
  PACKAGE_IDS,
  quote,
  siteCountry,
  type CatalogResponse,
  type FxRate,
  type QuoteResponse,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { FxService } from '../fx/fx.service';
import type { CatalogQuery, QuoteQuery } from './pricing.dto';

/** Site prices in the guardian's currency (docs/08); USD goes through FxService. */
@Injectable()
export class PricingService {
  constructor(private readonly fx: FxService) {}

  async catalog({ country, duration }: CatalogQuery): Promise<CatalogResponse> {
    const fx = await this.usdRate(country);
    const packages = PACKAGE_IDS.map((tier) =>
      quote({ tier, duration, country, students: 1, discount: 0, usdRate: fx?.rate }),
    );
    const currency = currencyForCountry(country).iso;
    return { country: siteCountry(country), currency, duration, packages, fx };
  }

  async quote(q: QuoteQuery): Promise<QuoteResponse> {
    const fx = await this.usdRate(q.country);
    return { ...quote({ ...q, usdRate: fx?.rate }), fx };
  }

  private usdRate(country: string | undefined): Promise<FxRate | null> {
    if (currencyForCountry(country).iso !== 'USD') return Promise.resolve(null);
    return this.fx.rateSarTo('USD');
  }
}
