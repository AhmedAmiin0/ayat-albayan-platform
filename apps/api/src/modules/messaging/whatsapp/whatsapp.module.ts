import { WA_LINES } from '@ab/catalog';
import { Global, Logger, Module, type OnModuleInit } from '@nestjs/common';
import { IntegrationConfigModule } from '@/common/configuration/integrations/integration-config.module';
import { bootGaps, lineProvider, loadEnv } from '@/config/env/env';
import { NumbersModule } from '@/modules/messaging/numbers';
import { EvolutionConfigModule } from '@/modules/messaging/whatsapp/drivers/evolution/config';
import { WhatsappGateModule } from '@/modules/messaging/whatsapp/gate';
import { WhatsappLinesModule } from '@/modules/messaging/whatsapp/lines';
import { WhatsappMessagesModule } from '@/modules/messaging/whatsapp/messages';
import { WhatsappSharedModule } from '@/modules/messaging/whatsapp/shared';
import { WhatsappTemplatesModule } from '@/modules/messaging/whatsapp/templates';
import { TemplateAuthorModule } from '@/modules/messaging/whatsapp/templates/author';

/**
 * B1 (docs/12 §1): the WhatsApp client, the template registry, the outbound sender and routes
 * T1–T3, M1–M2, one module per feature folder. Global: the inbox (B2) and the jobs (B3) inject
 * WHATSAPP_CLIENT, SendGate (is sending on?), MessageSender (kick after an enqueue),
 * TemplateRegistry (approved?), MessageViews and InboundMedia, so the shared, messages and lines
 * modules are re-exported. Two lines (docs/12 §13): WHATSAPP_LINES, and WHATSAPP_CLIENT = its
 * notifications client.
 */
@Global()
@Module({
  // Imported (though global) so the database's config is loaded before onModuleInit below;
  // NumbersModule so the numbers config (comms_source, docs/23 phase 3) is loaded before it too.
  imports: [
    ...[IntegrationConfigModule, NumbersModule, WhatsappSharedModule, WhatsappMessagesModule],
    ...[WhatsappLinesModule, WhatsappGateModule, WhatsappTemplatesModule, TemplateAuthorModule],
    EvolutionConfigModule,
  ],
  exports: [WhatsappSharedModule, WhatsappMessagesModule, WhatsappLinesModule],
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
