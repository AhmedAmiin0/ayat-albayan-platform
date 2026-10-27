import { Injectable, Logger } from '@nestjs/common';
import { lineEnvs, loadEnv, type WhatsappEnv } from '../../../../config/env/env';
import type { FetchLike } from '../../whatsapp/drivers/meta/graph';
import { reopenKapsoConversation } from '../../whatsapp/drivers/kapso/kapso-conversations';

/** The family's number as a log may show it: its last 4 digits only. */
export const last4 = (phone: string): string => `…${phone.replace(/\D/g, '').slice(-4)}`;

/** Kapso gets this long, both calls together (owner 2026-10-27: a slow Kapso never holds the reopen). */
const KAPSO_REOPEN_MS = 5_000;

interface KapsoReopenInput {
  phone: string;
  /** The chat line's env, read inside the guard (a bad env read is a Kapso failure, never the reopen's). */
  readEnv: () => WhatsappEnv | null;
  fetch?: FetchLike;
  timeoutMs?: number;
}

/**
 * Kapso's record of this phone's chat, back to `active` (owner 2026-10-26), only while the chat line
 * runs on the kapso driver (legacy: its WA_CHAT_* line; module mode: the default chat number, which
 * loadEnv lays over the same keys). Never throws and never takes longer than `timeoutMs`: past it the
 * calls are aborted and it answers false, whatever the fetch does. A failure is logged (no key, no
 * body, the phone's last 4 digits) and answers false, so the reopen template still goes.
 */
export async function kapsoReopen(input: KapsoReopenInput, log: Logger): Promise<boolean> {
  const abort = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      abort.abort();
      reject(new Error(`timed out after ${input.timeoutMs ?? KAPSO_REOPEN_MS} ms`));
    }, input.timeoutMs ?? KAPSO_REOPEN_MS);
  });
  try {
    return await Promise.race([attempt(input, abort.signal), deadline]);
  } catch (e) {
    log.warn(`Kapso conversation reopen failed for ${last4(input.phone)}: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function attempt(input: KapsoReopenInput, signal: AbortSignal): Promise<boolean> {
  const env = envOf(input);
  if (env?.provider !== 'kapso') return false;
  const base = input.fetch ?? globalThis.fetch;
  const fetch: FetchLike = (url, init) => base(url, { ...init, signal: init.signal ? AbortSignal.any([init.signal, signal]) : signal });
  return reopenKapsoConversation({ env, phone: input.phone, fetch });
}

/** Its error never reaches the log (a schema dump of the env): the line read failed, that is all. */
function envOf(input: KapsoReopenInput): WhatsappEnv | null {
  try {
    return input.readEnv();
  } catch {
    throw new Error('the chat line env could not be read');
  }
}

@Injectable()
export class KapsoReopener {
  private readonly log = new Logger('KapsoReopener');

  /** The env is read per call (a driver switch in «التكاملات» applies without a restart). */
  reopen(phone: string): Promise<boolean> {
    return kapsoReopen({ phone, readEnv: () => lineEnvs(loadEnv()).chat }, this.log);
  }
}
