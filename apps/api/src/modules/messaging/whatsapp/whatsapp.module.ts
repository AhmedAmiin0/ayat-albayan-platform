import { WA_LINES } from '@ab/shared';
import { Global, Logger, Module, type OnModuleInit } from '@nestjs/common';
import { IntegrationConfigModule } from '@/common/configuration/integrations/integration-config.module';
import { NumbersModule } from '@/modules/messaging/numbers/numbers.module';
import { bootGaps, lineProvider, loadEnv } from '@/config/env/env';
import { CodeSend } from './direct/code-send';
import { GateController } from './gate/gate.controller';
import { GateSettings } from './gate/gate.settings';
import { CrmHistoryMedia } from './messages/crm-history/crm-history-media';
import { CrmMediaSettings } from './messages/crm-history/crm-media.settings';
import { CrmMediaCopier } from './messages/crm-copy/crm-media-copier';
import { CrmMediaCopyDone } from './messages/crm-copy/crm-media-copy.done';
import { CrmMediaCopyJob } from './messages/crm-copy/crm-media-copy.job';
import { CrmMediaCopyQueries } from './messages/crm-copy/crm-media-copy.queries';
import { CrmMediaCopySettings } from './messages/crm-copy/crm-media-copy.settings';
import { InboundMedia } from './messages/inbound-media.service';
import { InboundMediaQueries } from './messages/inbound-media.queries';
import { LiveWhatsappClient } from './live-client';
import { LineHealthStore } from './lines/line-health.store';
import { LinesCheck } from './lines/lines.check';
import { LinesController } from './lines/lines.controller';
import { MessageDispatch } from './sender/message.dispatch';
import { MessageSender } from './sender/message.sender';
import { MessageViews } from './messages/message.views';
import { MessageWorker } from './sender/message.worker';
import { PaymentHoldRepo } from './sender/hold/payment-hold.repo';
import { PaymentHolds } from './sender/hold/payment-holds';
import { MessagesController } from './messages/messages.controller';
import { MessagesQueries } from './messages/messages.queries';
import { MessagesService } from './messages/messages.service';
import { SendGate } from './gate/send-gate';
import { NumberRoutes } from './numbers/number-routes';
import { RouteQueries } from './numbers/route.queries';
import { SenderQueries } from './sender/sender.queries';
import { TemplateNumbersController } from './templates/sync/template-numbers.controller';
import { TemplateNumbers } from './templates/sync/template-numbers.service';
import { TemplateStarters } from './templates/catalog/template-starters';
import { TemplateRegistry } from './templates/catalog/template.registry';
import { TemplatesController } from './templates/catalog/templates.controller';
import { TemplatesQueries } from './templates/catalog/templates.queries';
import { WaMediaRetentionJob } from './messages/wa-media.retention.job';
import { WhatsappSettings } from './whatsapp.settings';
import { WHATSAPP_CLIENT, WHATSAPP_LINES, type WhatsappClient, type WhatsappLines } from './whatsapp.types';

/**
 * One client per line (docs/12 §13.4); an unconfigured line's client refuses every call. Each reads
 * its config per call, so a value the admin saves in «التكاملات» applies without a restart.
 */
function lines(): WhatsappLines {
  return { notifications: new LiveWhatsappClient('notifications'), chat: new LiveWhatsappClient('chat') };
}

/**
 * B1 (docs/12 §1): WhatsappClient over WA_API_BASE, the template registry, the outbound sender
 * and routes T1–T3, M1–M2. Global: the inbox (B2) and the jobs (B3) inject WHATSAPP_CLIENT,
 * SendGate (is sending on?), MessageSender (kick after an enqueue), TemplateRegistry (approved?),
 * MessageViews (MessageView with click_to_chat) and InboundMedia (an inbound image / PDF as a file we
 * own, R-MSG-06; cached voice notes / videos purged after 30 days by WaMediaRetentionJob). Two lines
 * (docs/12 §13): WHATSAPP_LINES, and WHATSAPP_CLIENT = its notifications client.
 */
@Global()
@Module({
  // Imported (though global) so the database's config is loaded before onModuleInit below; NumbersModule
  // so the numbers config (comms_source, docs/23 phase 3) is loaded before it too.
  imports: [IntegrationConfigModule, NumbersModule],
  controllers: [TemplatesController, MessagesController, GateController, LinesController, TemplateNumbersController],
  providers: [
    { provide: WHATSAPP_LINES, useFactory: lines },
    { provide: WHATSAPP_CLIENT, useFactory: (l: WhatsappLines): WhatsappClient => l.notifications, inject: [WHATSAPP_LINES] },
    LinesCheck,
    LineHealthStore,
    TemplatesQueries,
    TemplateRegistry,
    TemplateStarters,
    TemplateNumbers,
    WhatsappSettings,
    GateSettings,
    SendGate,
    SenderQueries,
    RouteQueries,
    NumberRoutes,
    MessageDispatch,
    CodeSend,
    PaymentHoldRepo,
    PaymentHolds,
    MessageWorker,
    MessageSender,
    MessagesQueries,
    MessageViews,
    MessagesService,
    InboundMediaQueries,
    CrmMediaSettings,
    CrmHistoryMedia,
    CrmMediaCopySettings,
    CrmMediaCopyQueries,
    CrmMediaCopier,
    CrmMediaCopyDone,
    CrmMediaCopyJob,
    InboundMedia,
    WaMediaRetentionJob,
  ],
  exports: [WHATSAPP_CLIENT, WHATSAPP_LINES, TemplateRegistry, SendGate, CodeSend, MessageSender, MessageViews, InboundMedia, InboundMediaQueries, LineHealthStore],
})
export class WhatsappModule implements OnModuleInit {
  /**
   * Once at boot: what each line still lacks to SEND under its driver (env.gaps.ts bootGaps), by
   * name only (never values).
   */
  onModuleInit(): void {
    const env = loadEnv();
    for (const line of WA_LINES) {
      const gaps = bootGaps(env, line);
      if (gaps.length > 0) new Logger(WhatsappModule.name).warn(`${line} line (${lineProvider(env, line)}) cannot send yet, missing: ${gaps.join(', ')}`);
    }
  }
}
