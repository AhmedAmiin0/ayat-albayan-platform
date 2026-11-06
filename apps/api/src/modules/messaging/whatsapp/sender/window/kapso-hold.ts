import type { WaLine } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { overlayNumbers } from '@/common/configuration/integrations/numbers-overlay';
import type { FetchLike } from '@/common/infra/http/failure';
import { lineEnvs, loadEnv, type KapsoLineEnv, type WhatsappEnv } from '@/config/env/env';
import { reopenKapsoConversation } from '@/modules/messaging/whatsapp/drivers/kapso/kapso-conversations';
import type { NumberRoute } from '@/modules/messaging/whatsapp/numbers/number-route';

/** Kapso gets this long, list and PATCH together (the reopener's budget, owner 2026-10-27). */
const KAPSO_HOLD_MS = 5_000;
/** error_text keeps this much of Kapso's failure (never a key: the http core's message only). */
const MAX_TEXT = 200;

/** Where a held row leaves from: its line (legacy) or its number (module mode). */
interface KapsoHoldAt {
  phone: string;
  line: WaLine;
  route?: NumberRoute | null;
}

const isKapso = (env: WhatsappEnv | null | undefined): env is KapsoLineEnv =>
  env?.provider === 'kapso';
const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const numberEnv = (id: string): WhatsappEnv | null =>
  overlayNumbers()?.find((n) => n.id === id)?.env ?? null;

/** The row's own number's config in module mode, else its line's (legacy keys). */
function envOf(at: KapsoHoldAt): WhatsappEnv | null {
  const id = at.route?.numberId;
  return id ? numberEnv(id) : lineEnvs(loadEnv())[at.line];
}

/** Kapso's PATCH failed: what the held row's error_text says (the text itself still waits). */
const kapsoFailText = (message: string): string =>
  `kapso conversation reopen failed: ${message}`.slice(0, MAX_TEXT);

/**
 * Owner 2026-11-06: when a staff text is held after the window on a chat line that runs on Kapso,
 * Kapso's own conversation record goes back to `active` (PATCH /whatsapp/conversations/{id},
 * through the Kapso driver: the id is Kapso's, found by the phone on that number, since our
 * messages only keep Meta's conversation id). None found, or not ended: no PATCH. It does not
 * open WhatsApp's 24 h window (proven 11-02): the text still waits for the family. Never throws;
 * null = done or skipped, else the failure for the row's error_text. Logs the last 4 digits only.
 */
@Injectable()
export class KapsoHold {
  private readonly log = new Logger('KapsoHold');
  /** Tests only: a fake fetch (never Kapso). */
  fetch?: FetchLike;

  async reopen(at: KapsoHoldAt): Promise<string | null> {
    try {
      const env = envOf(at);
      if (!isKapso(env)) return null;
      const input = { env, phone: at.phone, timeoutMs: KAPSO_HOLD_MS, fetch: this.fetch };
      await reopenKapsoConversation(input);
      return null;
    } catch (e) {
      this.log.warn(`Kapso reopen failed for …${at.phone.slice(-4)}: ${messageOf(e)}`);
      return kapsoFailText(messageOf(e));
    }
  }
}
