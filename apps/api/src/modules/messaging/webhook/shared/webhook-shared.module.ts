import { Module } from '@nestjs/common';
import { loadEnv } from '@/config/env/env';
import type { WebhookConfig } from '@/modules/messaging/webhook/webhook.service';
import { liveWebhookConfig, WEBHOOK_CONFIG } from './webhook.config';
import { WebhookRepo } from './webhook.repo';
import { WebhookSettings } from './webhook.settings';

/**
 * What two or more webhook folders inject: the env settings (secrets, line numbers) read per
 * access, and the contacts / outbound rows repo with its settings slice.
 */
@Module({
  providers: [
    {
      provide: WEBHOOK_CONFIG,
      useFactory: (): WebhookConfig => liveWebhookConfig(() => loadEnv()),
    },
    WebhookRepo,
    WebhookSettings,
  ],
  exports: [WEBHOOK_CONFIG, WebhookRepo, WebhookSettings],
})
export class WebhookSharedModule {}
