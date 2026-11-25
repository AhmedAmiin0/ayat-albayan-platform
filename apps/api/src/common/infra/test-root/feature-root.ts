import { Global, Module, type DynamicModule } from '@nestjs/common';
import { NotificationPolicy } from '@/modules/messaging/notification-rules';
import { InboundMedia, InboundMediaRepo } from '@/modules/messaging/whatsapp';
import { INFRA } from './infra';
import type { Feature } from './test-root.types';

/**
 * Globals AppModule gets from the WhatsApp and notification-rules modules, whose own graphs reach
 * most of the app: empty placeholders that a test overrides when its routes use them.
 */
const PLACEHOLDERS = [NotificationPolicy, InboundMedia, InboundMediaRepo];

@Global()
@Module({
  providers: PLACEHOLDERS.map((provide) => ({ provide, useValue: {} })),
  exports: PLACEHOLDERS,
})
class MessagingPlaceholders {}

@Module({})
class FeatureTestRoot {}

/**
 * A test root with the global infrastructure and only the given feature modules: a test file then
 * imports its own module graph instead of the whole app, where most of the api suite's time went.
 */
export function featureRoot(...features: readonly Feature[]): DynamicModule {
  return { module: FeatureTestRoot, imports: [...INFRA, MessagingPlaceholders, ...features] };
}
