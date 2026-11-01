import { Injectable } from '@nestjs/common';
import { activeNumberId } from '@/common/configuration/integrations/numbers-overlay';
import { allowedRecipients, lineEnvs, loadEnv, type CrmLineEnv } from '@/config/env/env';
import { CrmWhatsappClient } from '@/modules/messaging/whatsapp/drivers/crm/crm.client';

// The notifications line as the relay needs it, read per call like LiveWhatsappClient (an admin's
// change in «التكاملات» applies to the next request): its CRM env (the key the script's Bearer must
// equal), its crm driver with the same allow-list, and the number module mode stamps on its rows.

export interface RelayLineNow {
  env: CrmLineEnv;
  client: Pick<CrmWhatsappClient, 'sendBody'>;
  /** messages.number_id in module mode (activeNumberId); undefined under legacy. */
  numberId: string | undefined;
}

@Injectable()
export class RelayLine {
  /** null = the notifications line is not on the crm driver (or not configured): 503. */
  current(): RelayLineNow | null {
    const env = loadEnv();
    const line = lineEnvs(env).notifications;
    if (line?.provider !== 'crm') return null;
    const client = new CrmWhatsappClient(line, { allowed: allowedRecipients(env) });
    return { env: line, client, numberId: activeNumberId('notifications') };
  }
}
