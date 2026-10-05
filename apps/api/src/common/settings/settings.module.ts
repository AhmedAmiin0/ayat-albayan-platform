import { Global, Module } from '@nestjs/common';
import { loadEnv } from '../../env';
import { SettingsController } from './settings.controller';
import { SettingsPublicController } from './settings.public.controller';
import { SETTINGS_CACHE_MS, SettingsService } from './settings.service';

/** Global: every module reads settings through SettingsService; admins edit them over HTTP. */
@Global()
@Module({
  controllers: [SettingsPublicController, SettingsController],
  providers: [{ provide: SETTINGS_CACHE_MS, useFactory: (): number => loadEnv().SETTINGS_CACHE_MS }, SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
