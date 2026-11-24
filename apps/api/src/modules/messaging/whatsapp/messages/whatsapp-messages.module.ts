import { Module } from '@nestjs/common';
import { WhatsappSharedModule } from '@/modules/messaging/whatsapp/shared';
import { AppSend, AppSendRepo } from './app-send';
import { CrmMediaCopier } from './crm-copy/crm-media-copier';
import { CrmMediaCopyDone } from './crm-copy/crm-media-copy.done';
import { CrmMediaCopyJob } from './crm-copy/crm-media-copy.job';
import { CrmMediaCopyRepo } from './crm-copy/crm-media-copy.repo';
import { CrmMediaCopySettings } from './crm-copy/crm-media-copy.settings';
import { CrmHistoryMedia } from './crm-history/crm-history-media';
import { CrmMediaSettings } from './crm-history/crm-media.settings';
import { InboundMedia, InboundMediaRepo, WaMediaRetentionJob } from './inbound-media';
import { MessageViews } from './message.views';
import { MessagesController } from './messages.controller';
import { MessagesRepo } from './messages.repo';
import { MessagesService } from './messages.service';

/**
 * Routes M1–M2 and the app sends; MessageViews (a MessageView with click_to_chat) and InboundMedia
 * (an inbound image / PDF as a file we own, R-MSG-06; cached voice notes / videos purged after
 * 30 days by WaMediaRetentionJob) are exported for the inbox and the jobs. CrmHistoryMedia sits
 * beside InboundMedia, its optional injector.
 */
@Module({
  imports: [WhatsappSharedModule],
  controllers: [MessagesController],
  providers: [
    ...[MessagesRepo, MessageViews, MessagesService, AppSendRepo, AppSend],
    ...[InboundMediaRepo, InboundMedia, WaMediaRetentionJob, CrmMediaSettings, CrmHistoryMedia],
    ...[CrmMediaCopySettings, CrmMediaCopyRepo, CrmMediaCopier, CrmMediaCopyDone, CrmMediaCopyJob],
  ],
  exports: [MessageViews, InboundMedia, InboundMediaRepo],
})
export class WhatsappMessagesModule {}
