import { Module } from '@nestjs/common';
import { loadEnv } from '../../env';
import { FX_FETCHER, OpenErApiFetcher, type FxFetcher } from './fx.fetcher';
import { FxQueries } from './fx.queries';
import { FxService } from './fx.service';

/** SAR→X exchange rates for USD quotes (docs/08 §4). No route: pricing (and Phase 3) inject FxService. */
@Module({
  providers: [
    FxService,
    FxQueries,
    // FX_API_URL read per fetch: the admin may change it in «التكاملات» (no restart).
    { provide: FX_FETCHER, useFactory: (): FxFetcher => ({ latest: () => new OpenErApiFetcher(loadEnv().FX_API_URL).latest() }) },
  ],
  exports: [FxService],
})
export class FxModule {}
