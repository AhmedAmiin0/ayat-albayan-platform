import { Global, Module } from '@nestjs/common';
import { TranslationsController } from './translations.controller';
import { TranslationsQueries } from './translations.queries';
import { TranslationsService } from './translations.service';

/** Global: it keeps the server's live Arabic copy (common/i18n/server-text) merged with overrides. */
@Global()
@Module({
  controllers: [TranslationsController],
  providers: [TranslationsQueries, TranslationsService],
  exports: [TranslationsService],
})
export class TranslationsModule {}
