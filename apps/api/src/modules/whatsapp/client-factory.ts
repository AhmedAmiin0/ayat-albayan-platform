import type { WhatsappEnv } from '../../config/env/env';
import { CrmWhatsappClient } from './drivers/crm/crm.client';
import { HttpWhatsappClient, type ClientOpts } from './whatsapp.client';
import type { WhatsappClient } from './whatsapp.types';

/**
 * THE way to build a line's or a number's client (docs/19): the crm driver gets CrmWhatsappClient, meta and
 * kapso the Graph client. null = not configured: a client that refuses every call before any request.
 */
export function whatsappClient(env: WhatsappEnv | null, opts: ClientOpts = {}): WhatsappClient {
  return env?.provider === 'crm' ? new CrmWhatsappClient(env, opts) : new HttpWhatsappClient(env, opts);
}
