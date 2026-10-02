import type { FxRate } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { FxService } from '../fx/fx.service';
import { errorCode } from '../scheduling/errors';
import { conversionFrom, type Conversion } from './conversion';

const SAR_SELF: FxRate = { quote: 'SAR', rate: 1, date: null, provider: 'self', fallback: false, ageHours: null };

/** Reads one rate per currency met in the data; nothing at all when all of it is in `reporting`. */
@Injectable()
export class FxConverter {
  constructor(private readonly fx: FxService) {}

  async conversion(reporting: string, currencies: Iterable<string>): Promise<Conversion> {
    const others = [...new Set(currencies)].filter((c) => c !== reporting).sort();
    if (others.length === 0) return conversionFrom({ reporting, base: SAR_SELF, quotes: [] });
    const [base, ...rates] = await Promise.all([reporting, ...others].map((c) => this.sarTo(c)));
    return conversionFrom({ reporting, base: base ?? null, quotes: others.map((c, i) => [c, rates[i] ?? null]) });
  }

  /** null when no rate is stored and the provider is down (fx_unavailable); other errors throw. */
  private async sarTo(currency: string): Promise<FxRate | null> {
    if (currency === 'SAR') return SAR_SELF;
    try {
      return await this.fx.rateSarTo(currency);
    } catch (e) {
      if (errorCode(e) === 'fx_unavailable') return null;
      throw e;
    }
  }
}
