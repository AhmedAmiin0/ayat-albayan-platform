import type { WaLine } from '@ab/shared';
import { overlayNumbers } from '@/common/configuration/integrations/numbers-overlay';
import { lineEnvs, lineProvider, loadEnv, type Env } from '@/config/env/env';
import type { WhatsappEnv } from '@/config/env/whatsapp/env.whatsapp';
import type { NumberRoute } from '@/modules/messaging/whatsapp/numbers/number-route';

/** Where a row leaves from, as the line hold sees it. */
export interface HoldPlace {
  line: WaLine;
  route?: NumberRoute | null;
}

/** The base plus the current driver and its WABA / number ids; null = crm (never 131042-held). */
function withConn(base: string, env: WhatsappEnv | null): string | null {
  if (!env) return base;
  if (env.provider === 'crm') return null;
  return `${base}:${env.provider ?? 'meta'}:${env.wabaId}:${env.phoneNumberId}`;
}

/**
 * The in-memory line hold's key: the line under legacy, the number in module mode (docs/23c), each
 * with its CURRENT driver and WABA / phone-number id, so a live switch (another WABA, kapso, crm)
 * starts unheld. null = never line-held: the line (number) is on the crm driver.
 */
export function holdKey(at: HoldPlace, env: Env = loadEnv()): string | null {
  if (at.route) {
    const id = at.route.numberId;
    return withConn(`number:${id}`, overlayNumbers()?.find((n) => n.id === id)?.env ?? null);
  }
  if (lineProvider(env, at.line) === 'crm') return null;
  return withConn(`line:${at.line}`, lineEnvs(env)[at.line]);
}
