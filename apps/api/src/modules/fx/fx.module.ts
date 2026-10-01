import { Module } from '@nestjs/common';
import { loadEnv } from '../../env';
import { FX_FETCHER, OpenErApiFetcher } from './fx.fetcher';
import { FxQueries } from './fx.queries';
import { FxService } from './fx.service';

/** SAR→X exchange rates for USD quotes (docs/08 §4). No route: pricing (and Phase 3) inject FxService. */
@Module({
  providers: [
    FxService,
    FxQueries,
    { provide: FX_FETCHER, useFactory: () => new OpenErApiFetcher(loadEnv().FX_API_URL) },
  ],
  exports: [FxService],
})
export class FxModule {}
