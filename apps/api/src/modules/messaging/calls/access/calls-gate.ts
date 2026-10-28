import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { forbidden, notFound } from '../../../../common/http/errors';
import { allowedRecipients, loadEnv, recipientAllowed } from '../../../../config/env/env';
import { CallsSettings } from '../calls.settings';
import { callingLine, type CallingLine } from '../kapso/calling-line';
import { permissionTemplate } from '../kapso/permission-body';
import { SendGate } from '../../whatsapp';

/**
 * The feature's gates (docs/28 §6), checked by every call route before anything else: the setting
 * (off = 404 calls_disabled, as if the routes did not exist), the calling line (not Kapso = 503
 * calls_unavailable) and the staging allow-list WA_ALLOWED_RECIPIENTS (403 recipient_not_allowed:
 * never a call to a number outside it). A message the calls number sends (the permission request only,
 * docs/28 §10) also needs the one send gate (messaging_enabled).
 */
@Injectable()
export class CallsGate {
  constructor(
    private readonly settings: CallsSettings,
    private readonly send: SendGate,
  ) {}

  async enabled(): Promise<boolean> {
    return (await this.settings.read()).whatsapp_calls_enabled === true;
  }

  async assertOn(): Promise<void> {
    if (!(await this.enabled())) throw notFound('calls_disabled');
  }

  /** The one send gate (WhatsApp configured and messaging_enabled): closed = nothing leaves the calls number. */
  messagingOpen(): Promise<boolean> {
    return this.send.open();
  }

  /** calls_permission_template as a template (name, language); null = unset (the button is disabled). */
  async permissionTemplate(): Promise<{ name: string; language: string } | null> {
    return permissionTemplate((await this.settings.read()).calls_permission_template);
  }

  /** The calls number, else the chat line on Kapso, or 503 calls_unavailable. */
  line(): CallingLine {
    const line = callingLine();
    if (!line) throw new ServiceUnavailableException({ code: 'calls_unavailable', message: 'calls_unavailable' });
    return line;
  }

  assertRecipient(phone: string): void {
    if (!recipientAllowed(allowedRecipients(loadEnv()), phone)) throw forbidden('recipient_not_allowed');
  }
}
