import { Module } from '@nestjs/common';
import { IntegrationConfigModule } from '@/common/configuration/integrations/integration-config.module';
import { NumbersModule } from '@/modules/messaging/numbers';
import { CodeSend } from '@/modules/messaging/whatsapp/direct/code-send';
import { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { SendGateRepo } from '@/modules/messaging/whatsapp/gate/send-gate.repo';
import { LiveWhatsappClient } from '@/modules/messaging/whatsapp/live-client';
import {
  CRM_SENT_PROVIDERS, CrmCopiesRepo, CrmSentText,
} from '@/modules/messaging/whatsapp/messages/crm-sent';
import { NumberRoutes } from '@/modules/messaging/whatsapp/numbers/number-routes';
import { RouteRepo } from '@/modules/messaging/whatsapp/numbers/route.repo';
import { LineOutages } from '@/modules/messaging/whatsapp/sender/hold/line-outages';
import { PaymentHoldRepo } from '@/modules/messaging/whatsapp/sender/hold/payment-hold.repo';
import { PaymentHolds } from '@/modules/messaging/whatsapp/sender/hold/payment-holds';
import { MessageDispatch } from '@/modules/messaging/whatsapp/sender/message.dispatch';
import { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';
import { MessageWorker } from '@/modules/messaging/whatsapp/sender/message.worker';
import { EvolutionPaceRepo } from '@/modules/messaging/whatsapp/sender/pace';
import { SenderRepo } from '@/modules/messaging/whatsapp/sender/sender.repo';
import { SenderWake } from '@/modules/messaging/whatsapp/sender/wake/sender-wake.registrar';
import { KapsoHold } from '@/modules/messaging/whatsapp/sender/window/kapso-hold';
import * as manualSend from '@/modules/messaging/whatsapp/sender/window/manual-send';
import { ReopenAudit } from '@/modules/messaging/whatsapp/sender/window/reopen-audit';
import { ReopenRequest } from '@/modules/messaging/whatsapp/sender/window/reopen-request';
import { WindowHold } from '@/modules/messaging/whatsapp/sender/window/window-hold';
import { WindowRelease } from '@/modules/messaging/whatsapp/sender/window/window-release';
import { WindowRepo } from '@/modules/messaging/whatsapp/sender/window/window.repo';
import { WindowSettings } from '@/modules/messaging/whatsapp/sender/window/window.settings';
import { TemplateRegistry } from '@/modules/messaging/whatsapp/templates/catalog/template.registry';
import { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { TemplateMissing } from '@/modules/messaging/whatsapp/templates/check/template-missing';
import { TemplateEditor } from '@/modules/messaging/whatsapp/templates/edit/template-editor';
import { TemplateNames } from '@/modules/messaging/whatsapp/templates/names/template-names';
import { TemplateVerifier } from '@/modules/messaging/whatsapp/templates/sync/template-verifier';
import { WhatsappSettings } from '@/modules/messaging/whatsapp/whatsapp.settings';
import {
  WHATSAPP_CLIENT, WHATSAPP_LINES, type WhatsappClient, type WhatsappLines,
} from '@/modules/messaging/whatsapp/whatsapp.types';

/** One client per line (docs/12 §13.4), config read per call so saved values apply at once. */
function lines(): WhatsappLines {
  return {
    notifications: new LiveWhatsappClient('notifications'),
    chat: new LiveWhatsappClient('chat'),
  };
}

const notifications = (l: WhatsappLines): WhatsappClient => l.notifications;

const WINDOW_PROVIDERS = [
  ...[WindowRepo, WindowSettings, ReopenRequest, ReopenAudit, WindowRelease, WindowHold, KapsoHold],
  ...[manualSend.ReopenPickRepo, manualSend.ReopenPick],
  ...[manualSend.ReopenCancelRepo, manualSend.ReopenCancel],
  ...[manualSend.AppSendAdoptRepo, manualSend.AppSendAdopt],
  ...[manualSend.AppSendExpiryRepo, manualSend.AppSendExpiry],
];

/**
 * The client per line, the template registry and the outbound sender (docs/12 §1, B1), which
 * two or more whatsapp feature modules and the global WhatsappModule's callers inject. Every
 * optional injection (NumberRoutes, TemplateMissing, WindowHold, the CRM copies...) is provided
 * here next to its injector, so none silently resolves to nothing. The integration and numbers
 * configs are imported so they load before the sender starts (docs/23 phase 3).
 */
@Module({
  imports: [IntegrationConfigModule, NumbersModule],
  providers: [
    { provide: WHATSAPP_LINES, useFactory: lines },
    { provide: WHATSAPP_CLIENT, useFactory: notifications, inject: [WHATSAPP_LINES] },
    ...[TemplatesRepo, TemplateRegistry, TemplateVerifier, TemplateEditor, TemplateNames],
    ...[TemplateMissing, ...CRM_SENT_PROVIDERS],
    ...[WhatsappSettings, SendGate, SenderRepo, RouteRepo, NumberRoutes, MessageDispatch, CodeSend],
    ...[PaymentHoldRepo, PaymentHolds, LineOutages, EvolutionPaceRepo, SendGateRepo],
    ...WINDOW_PROVIDERS,
    ...[MessageWorker, MessageSender, SenderWake],
  ],
  exports: [
    ...[WHATSAPP_CLIENT, WHATSAPP_LINES, TemplatesRepo, TemplateRegistry, TemplateVerifier],
    ...[TemplateEditor, TemplateNames, CrmCopiesRepo, CrmSentText],
    ...[SendGate, CodeSend, MessageSender, ReopenRequest],
    ...[manualSend.ReopenCancel, manualSend.ReopenPick, manualSend.AppSendAdopt],
  ],
})
export class WhatsappSharedModule {}
