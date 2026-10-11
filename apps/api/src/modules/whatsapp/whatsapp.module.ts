import { Global, Logger, Module, type OnModuleInit } from '@nestjs/common';
import { allowedRecipients, chatGaps, lineEnvs, loadEnv } from '../../env';
import { InboundMedia } from './inbound-media.service';
import { InboundMediaQueries } from './inbound-media.queries';
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
import { TemplateRegistry } from './template.registry';
import { TemplatesController } from './templates.controller';
import { TemplatesQueries } from './templates.queries';
import { HttpWhatsappClient } from './whatsapp.client';
import { WHATSAPP_CLIENT, WHATSAPP_LINES, type WhatsappClient, type WhatsappLines } from './whatsapp.types';

/** One client per line (docs/12 §13.4); an unconfigured line's client refuses every call. */
function lines(): WhatsappLines {
  const env = loadEnv();
  const envs = lineEnvs(env);
  const allowed = allowedRecipients(env);
  return {
    notifications: new HttpWhatsappClient(envs.notifications, { allowed }),
    chat: new HttpWhatsappClient(envs.chat, { allowed }),
  };
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
  controllers: [TemplatesController, MessagesController, LinesController],
  providers: [
    { provide: WHATSAPP_LINES, useFactory: lines },
    { provide: WHATSAPP_CLIENT, useFactory: (l: WhatsappLines): WhatsappClient => l.notifications, inject: [WHATSAPP_LINES] },
    LinesCheck,
    TemplatesQueries,
    TemplateRegistry,
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
  /** Once at boot: the chat pieces SENDING still lacks, by name only (never values). */
  onModuleInit(): void {
    const gaps = chatGaps(loadEnv());
    if (gaps.length > 0) new Logger(WhatsappModule.name).warn(`chat line cannot send yet, missing: ${gaps.join(', ')}`);
  }
}
