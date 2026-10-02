import { Module } from '@nestjs/common';

/**
 * B1 (docs/12 §1): WhatsappClient (provided as WHATSAPP_CLIENT), TemplateRegistry, MessageSender
 * and the /messaging/templates + /messages/:id routes. Registered in app.module.ts already; make it
 * @Global() or export what B2/B3 inject.
 */
@Module({})
export class WhatsappModule {}
