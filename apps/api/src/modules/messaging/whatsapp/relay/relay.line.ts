import { Injectable } from '@nestjs/common';
import { activeNumberId } from '@/common/configuration/integrations/numbers-overlay';
import {
  allowedRecipients,
  isGraphEnv,
  lineEnvs,
  loadEnv,
  type CrmLineEnv,
  type WhatsappEnv,
} from '@/config/env/env';
import { crmLine } from '@/config/env/whatsapp/env.crm';
import type { CrmBody } from '@/modules/messaging/whatsapp/drivers/crm/crm-body';
import { CrmWhatsappClient, crmFetch } from '@/modules/messaging/whatsapp/drivers/crm/crm.client';
import type { FetchLike } from '@/modules/messaging/whatsapp/drivers/meta/graph';
import { HttpWhatsappClient } from '@/modules/messaging/whatsapp/whatsapp.client';
import type { WaSent } from '@/modules/messaging/whatsapp/whatsapp.types';

// The notifications line as the relay needs it, read per call like LiveWhatsappClient (an admin's
// change in «التكاملات» applies to the next request): the CRM account the script's Bearer is
// checked against (WACRM_API_BASE + WACRM_API_KEY, kept after the switch), the line's CURRENT
// driver with the same allow-list (docs/19 «CRM → Meta»: crm, or meta / kapso through Graph), and
// the number module mode stamps on its rows.

/** Sends a body in the CRM's shape (the script's) on the line's driver. */
export interface RelaySender {
  sendBody(body: CrmBody): Promise<WaSent>;
}

export interface RelayLineNow {
  env: CrmLineEnv;
  client: RelaySender;
  /** messages.number_id in module mode (activeNumberId); undefined under legacy. */
  numberId: string | undefined;
  /** For the key check's GET /me (relay.keys.ts). */
  fetch: FetchLike;
}

/** The line's own driver: the CRM's POST /messages, or Graph's (the same body as Meta's shapes). */
export function relaySender(
  line: WhatsappEnv,
  allowed: readonly string[] | null,
): RelaySender | null {
  if (line.provider === 'crm') return new CrmWhatsappClient(line, { allowed });
  // An Evolution line takes no CRM-shaped body (the relay is the notifications line's, docs/19).
  return isGraphEnv(line) ? new HttpWhatsappClient(line, { allowed }) : null;
}

@Injectable()
export class RelayLine {
  /** null = the line is not configured, or the CRM account of the script's key is not set: 503. */
  current(): RelayLineNow | null {
    const env = loadEnv();
    const line = lineEnvs(env).notifications;
    const crm = crmLine(env, 'notifications');
    const client = line ? relaySender(line, allowedRecipients(env)) : null;
    if (!client || !crm) return null;
    return { env: crm, client, numberId: activeNumberId('notifications'), fetch: crmFetch };
  }
}
