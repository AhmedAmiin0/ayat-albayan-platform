import { Module } from '@nestjs/common';
import { CustomConfigController } from './custom-config.controller';
import { CustomConfigService } from './custom-config.service';

/**
 * «قيم مخصصة»: the free-form `custom_config` entries. Admin CRUD over /config/custom; the entries
 * flagged public are read by PublicConfigModule (GET /settings/public) through CustomConfigService.
 */
@Module({
  controllers: [CustomConfigController],
  providers: [CustomConfigService],
  exports: [CustomConfigService],
})
export class CustomConfigModule {}
