import { Module } from '@nestjs/common';
import { RulesController } from './rules.controller';
import { RulesQueries } from './rules.queries';
import { RulesService } from './rules.service';

/**
 * The notification catalogue's admin side (docs/23 §2c). Phase 1: read-only GET /admin/notifications.
 * SendGate and LineHealthStore come from the global WhatsappModule, SettingsService from SettingsModule.
 */
@Module({
  controllers: [RulesController],
  providers: [RulesQueries, RulesService],
})
export class NotificationRulesModule {}
