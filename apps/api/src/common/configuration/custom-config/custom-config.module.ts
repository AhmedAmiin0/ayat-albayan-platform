import { Module } from '@nestjs/common';
import { CustomConfigController } from './custom-config.controller';
import { CustomConfigService } from './custom-config.service';

/** Entries flagged public are served by PublicConfigModule (GET /settings/public). */
@Module({
  controllers: [CustomConfigController],
  providers: [CustomConfigService],
  exports: [CustomConfigService],
})
export class CustomConfigModule {}
