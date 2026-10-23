import { Module } from '@nestjs/common';
import { NotificationRulesSettings } from './notification-rules.settings';
import { RulesController } from './rules.controller';
import { RulesQueries } from './rules.queries';
import { RulesService } from './rules.service';

/**
 * The notification catalogue's admin side (docs/23 §2c). Phase 1: read-only GET /admin/notifications.
 * SendGate and LineHealthStore come from the global WhatsappModule (which provides SendGate and its
 * WhatsappSettings); NotificationRulesSettings reads the catalogue's slice of the global SettingsService.
 */
@Module({
  controllers: [RulesController],
  providers: [NotificationRulesSettings, RulesQueries, RulesService],
})
export class NotificationRulesModule {}
