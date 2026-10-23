import { Module } from '@nestjs/common';
import { CustomConfigModule } from '../custom-config/custom-config.module';
import { PublicConfigController } from './public-config.controller';

/**
 * GET /settings/public: the composite read model of the public settings and the public custom
 * entries. SettingsService comes from the global SettingsModule; CustomConfigService from
 * CustomConfigModule.
 */
@Module({
  imports: [CustomConfigModule],
  controllers: [PublicConfigController],
})
export class PublicConfigModule {}
