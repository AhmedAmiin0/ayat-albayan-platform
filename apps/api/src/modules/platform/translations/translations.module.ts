import { Global, Module } from '@nestjs/common';
import { OVERRIDES_REFRESH, type OverridesRefresh } from '@/common/configuration/config-store/config-store.types';
import { TranslationsController } from './translations.controller';
import { TranslationsQueries } from './translations.queries';
import { TranslationsService } from './translations.service';

/** Global: it keeps the server's live Arabic copy (common/i18n/server-text) merged with overrides. */
@Global()
@Module({
  controllers: [TranslationsController],
  providers: [
    TranslationsQueries,
    TranslationsService,
    // ConfigStore reloads the overrides after a description edit (it writes the ar override, docs/26 §3).
    { provide: OVERRIDES_REFRESH, useFactory: (t: TranslationsService): OverridesRefresh => () => t.refresh(), inject: [TranslationsService] },
  ],
  exports: [TranslationsService, OVERRIDES_REFRESH],
})
export class TranslationsModule {}
