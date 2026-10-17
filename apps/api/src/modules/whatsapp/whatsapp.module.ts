import { WA_LINES } from '@ab/shared';
import { Global, Logger, Module, type OnModuleInit } from '@nestjs/common';
import { IntegrationConfigModule } from '../../common/integrations/integration-config.module';
import { lineGaps, lineProvider, loadEnv } from '../../env';
import { InboundMedia } from './inbound-media.service';
import { InboundMediaQueries } from './inbound-media.queries';
import { LiveWhatsappClient } from './live-client';
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
 * own, R-MSG-06). Two lines (docs/12 §13): WHATSAPP_LINES, and WHATSAPP_CLIENT = its notifications client.
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
  ],
  exports: [WHATSAPP_CLIENT, WHATSAPP_LINES, TemplateRegistry, SendGate, MessageSender, MessageViews, InboundMedia, InboundMediaQueries],
})
export class WhatsappModule implements OnModuleInit {
  /**
   * Once at boot: what each line still lacks to SEND under its driver, by name only (never values).
   * An unset meta notifications line just means messaging is off (local dev): no warning, as before.
   */
  onModuleInit(): void {
    const env = loadEnv();
    for (const line of WA_LINES) {
      const provider = lineProvider(env, line);
      const gaps = line === 'notifications' && provider === 'meta' ? [] : lineGaps(env, line);
      if (gaps.length > 0) new Logger(WhatsappModule.name).warn(`${line} line (${provider}) cannot send yet, missing: ${gaps.join(', ')}`);
    }
  }
}
