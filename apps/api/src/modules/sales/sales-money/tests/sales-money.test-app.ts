// The sales-money test app (test-only): the money harness on SalesMoneyModule and the global
// infrastructure it injects, not AppModule.
import { Global, Module } from '@nestjs/common';
import type { TestingModuleBuilder } from '@nestjs/testing';
import { AuditModule } from '@/common/audit/audit.service';
import type { PermissionResolver } from '@/common/auth/permissions';
import { AuthModule } from '@/common/auth/auth.module';
import { ConfigStoreModule } from '@/common/configuration/config-store/config-store.module';
import { IntegrationConfigModule } from '@/common/configuration/integrations/integration-config.module';
import { DbModule } from '@/common/db/db.module';
import { CacheModule } from '@/common/infra/cache/cache.module';
import { LessonEventsModule } from '@/common/infra/events/lesson-events';
import { PushModule } from '@/common/push/push.module';
import { SettingsModule } from '@/common/settings/settings.module';
import { AvatarsModule } from '@/common/storage/avatars/avatars.module';
import { StorageOpsModule } from '@/common/storage/probe';
import { moneyAppOf } from '@/modules/finance/subscriptions/tests/test-app';
import { NotificationPolicy } from '@/modules/messaging/notification-rules/policy/policy';
import { InboundMediaRepo } from '@/modules/messaging/whatsapp/messages/inbound-media/inbound-media.repo';
import { InboundMedia } from '@/modules/messaging/whatsapp/messages/inbound-media/inbound-media.service';
import { SalesMoneyModule } from '@/modules/sales/sales-money';

/**
 * Globals AppModule gets from the WhatsApp and notification-rules modules, whose own graphs
 * reach most of the app: placeholders here, the money harness overrides the media ones.
 */
const PLACEHOLDERS = [NotificationPolicy, InboundMedia, InboundMediaRepo];

@Global()
@Module({
  providers: PLACEHOLDERS.map((provide) => ({ provide, useValue: {} })),
  exports: PLACEHOLDERS,
})
class MessagingPlaceholders {}

@Module({
  imports: [
    ...[DbModule, CacheModule, IntegrationConfigModule, ConfigStoreModule, AuditModule],
    ...[AuthModule, SettingsModule, StorageOpsModule, AvatarsModule, LessonEventsModule],
    ...[PushModule, MessagingPlaceholders, SalesMoneyModule],
  ],
})
class SalesMoneyTestRoot {}

/** moneyApp's mocks, tokens and `call` on SalesMoneyModule and the admin money routes. */
export function salesMoneyApp(
  resolver?: PermissionResolver,
  more?: (b: TestingModuleBuilder) => TestingModuleBuilder,
) {
  return moneyAppOf(SalesMoneyTestRoot, resolver, more);
}
