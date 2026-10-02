import { Global, Module } from '@nestjs/common';
import { loadEnv, whatsappEnv } from '../../env';
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
import { WHATSAPP_CLIENT, type WhatsappClient } from './whatsapp.types';

/**
 * B1 (docs/12 §1): WhatsappClient over WA_API_BASE, the template registry, the outbound sender
 * and routes T1–T3, M1–M2. Global: the inbox (B2) and the jobs (B3) inject WHATSAPP_CLIENT,
 * SendGate (is sending on?), MessageSender (kick after an enqueue), TemplateRegistry (approved?)
 * and MessageViews (MessageView with click_to_chat).
 */
@Global()
@Module({
  controllers: [TemplatesController, MessagesController],
  providers: [
    { provide: WHATSAPP_CLIENT, useFactory: (): WhatsappClient => new HttpWhatsappClient(whatsappEnv(loadEnv())) },
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
  ],
  exports: [WHATSAPP_CLIENT, TemplateRegistry, SendGate, MessageSender, MessageViews],
})
export class WhatsappModule {}
