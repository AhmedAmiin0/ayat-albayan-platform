import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { forbidden, notFound } from '../../../../common/http/errors';
import { allowedRecipients, loadEnv, recipientAllowed } from '../../../../config/env/env';
import { CallsSettings } from '../calls.settings';
import { callingLine, type CallingLine } from '../kapso/calling-line';

/**
 * The feature's gates (docs/28 §6), checked by every call route before anything else: the setting
 * (off = 404 calls_disabled, as if the routes did not exist), the calling line (not Kapso = 503
 * calls_unavailable) and the staging allow-list WA_ALLOWED_RECIPIENTS (403 recipient_not_allowed:
 * never a call to a number outside it).
 */
@Injectable()
export class CallsGate {
  constructor(private readonly settings: CallsSettings) {}

  async enabled(): Promise<boolean> {
    return (await this.settings.read()).whatsapp_calls_enabled === true;
  }

  async assertOn(): Promise<void> {
    if (!(await this.enabled())) throw notFound('calls_disabled');
  }

  /** The chat line on Kapso, or 503 calls_unavailable. */
  line(): CallingLine {
    const line = callingLine();
    if (!line) throw new ServiceUnavailableException({ code: 'calls_unavailable', message: 'calls_unavailable' });
    return line;
  }

  assertRecipient(phone: string): void {
    if (!recipientAllowed(allowedRecipients(loadEnv()), phone)) throw forbidden('recipient_not_allowed');
  }
}
