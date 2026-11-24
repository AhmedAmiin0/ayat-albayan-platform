import { Module } from '@nestjs/common';
import { ManualEchoModule } from '@/modules/messaging/webhook/external/manual-echo';
import { WebhookSharedModule } from '@/modules/messaging/webhook/shared';
import { ExternalCatchUpJob } from './external-catchup.job';
import { ExternalStatus, KAPSO_HISTORY } from './external-status';
import { ExternalRepo } from './external.repo';
import { ExternalStore } from './external.store';
import { KapsoHistory } from './kapso-history';

/** Messages staff send outside the app (Kapso's inbox, WhatsApp Business app echoes). */
@Module({
  imports: [WebhookSharedModule, ManualEchoModule],
  providers: [
    { provide: KAPSO_HISTORY, useFactory: () => new KapsoHistory() },
    ExternalRepo,
    ExternalStore,
    ExternalStatus,
    ExternalCatchUpJob,
  ],
  exports: [KAPSO_HISTORY, ExternalRepo, ExternalStatus],
})
export class WebhookExternalModule {}
