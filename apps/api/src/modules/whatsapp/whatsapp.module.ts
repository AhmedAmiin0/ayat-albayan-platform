import { WA_LINES } from '@ab/shared';
import { Global, Logger, Module, type OnModuleInit } from '@nestjs/common';
import { IntegrationConfigModule } from '../../common/integrations/integration-config.module';
import { bootGaps, lineProvider, loadEnv } from '../../env';
import { InboundMedia } from './inbound-media.service';
import { InboundMediaQueries } from './inbound-media.queries';
import { LiveWhatsappClient } from './live-client';
import { LineHealthStore } from './line-health.store';
import { LinesCheck } from './lines.check';
import { LinesController } from './lines.controller';
import { MessageDispatch } from './message.dispatch';
import { MessageSender } from './message.sender';
import { MessageViews } from './message.views';
import { MessageWorker } from './message.worker';
import { MessagesController } from './messages.controller';
import { MessagesQueries } from './messages.queries';
import { MessagesService } from './messages.service';
import { SendGate } from './send-gate';
import { SenderQueries } from './sender.queries';
import { TemplateStarters } from './template-starters';
import { TemplateRegistry } from './template.registry';
import { TemplatesController } from './templates.controller';
import { TemplatesQueries } from './templates.queries';
import { WaMediaRetentionJob } from './wa-media.retention.job';
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
  // Imported (though global) so the database's config is loaded before onModuleInit below.
  imports: [IntegrationConfigModule],
  controllers: [TemplatesController, MessagesController, LinesController],
  providers: [
    { provide: WHATSAPP_LINES, useFactory: lines },
    { provide: WHATSAPP_CLIENT, useFactory: (l: WhatsappLines): WhatsappClient => l.notifications, inject: [WHATSAPP_LINES] },
    LinesCheck,
    LineHealthStore,
    TemplatesQueries,
    TemplateRegistry,
    TemplateStarters,
    SendGate,
    SenderQueries,
    MessageDispatch,
    MessageWorker,
    MessageSender,
    MessagesQueries,
    MessageViews,
    MessagesService,
    InboundMediaQueries,
    InboundMedia,
    WaMediaRetentionJob,
  ],
  exports: [WHATSAPP_CLIENT, WHATSAPP_LINES, TemplateRegistry, SendGate, MessageSender, MessageViews, InboundMedia, InboundMediaQueries, LineHealthStore],
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
