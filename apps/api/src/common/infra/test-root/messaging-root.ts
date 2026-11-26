import { Module, type DynamicModule } from '@nestjs/common';
import { OwnNumbersModule } from '@/modules/messaging/numbers';
import { NotificationRulesModule } from '@/modules/messaging/notification-rules';
import { WhatsappModule } from '@/modules/messaging/whatsapp';
import { INFRA } from './infra';
import type { Feature } from './test-root.types';

const MESSAGING = [WhatsappModule, OwnNumbersModule, NotificationRulesModule];

@Module({})
class MessagingTestRoot {}

/** featureRoot for a feature that sends: the real WhatsApp, own-numbers and rules globals. */
export function messagingRoot(...features: readonly Feature[]): DynamicModule {
  return { module: MessagingTestRoot, imports: [...INFRA, ...MESSAGING, ...features] };
}
