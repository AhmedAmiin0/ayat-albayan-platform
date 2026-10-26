import { Injectable, Logger } from '@nestjs/common';
import { lineEnvs, loadEnv, type WhatsappEnv } from '../../../../config/env/env';
import type { FetchLike } from '../../whatsapp/drivers/meta/graph';
import { reopenKapsoConversation } from '../../whatsapp/drivers/kapso/kapso-conversations';

/** The family's number as a log may show it: its last 4 digits only. */
export const last4 = (phone: string): string => `…${phone.replace(/\D/g, '').slice(-4)}`;

/**
 * Kapso's record of this phone's chat, back to `active` (owner 2026-10-26), only while the chat line
 * runs on the kapso driver (legacy: its WA_CHAT_* line; module mode: the default chat number, which
 * loadEnv lays over the same keys). Never throws: a Kapso failure is logged (no key, no body, the
 * phone's last 4 digits) and answers false, so the reopen request still succeeds.
 */
export async function kapsoReopen(input: { phone: string; env: WhatsappEnv | null; fetch?: FetchLike }, log: Logger): Promise<boolean> {
  if (input.env?.provider !== 'kapso') return false;
  try {
    return await reopenKapsoConversation({ env: input.env, phone: input.phone, ...(input.fetch ? { fetch: input.fetch } : {}) });
  } catch (e) {
    log.warn(`Kapso conversation reopen failed for ${last4(input.phone)}: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

@Injectable()
export class KapsoReopener {
  private readonly log = new Logger('KapsoReopener');

  /** The env is read per call (a driver switch in «التكاملات» applies without a restart). */
  reopen(phone: string): Promise<boolean> {
    return kapsoReopen({ phone, env: lineEnvs(loadEnv()).chat }, this.log);
  }
}
