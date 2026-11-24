import type { WaLine } from '@ab/catalog';
import { overlayNumbers } from '@/common/configuration/integrations/numbers-overlay';
import { lineEnvs, lineProvider, loadEnv, type Env } from '@/config/env/env';
import type { WhatsappEnv } from '@/config/env/whatsapp/env.whatsapp';
import type { NumberRoute } from '@/modules/messaging/whatsapp/numbers/number-route';

/** Where a row leaves from, as the line hold sees it. */
export interface HoldPlace {
  line: WaLine;
  route?: NumberRoute | null;
}

/** The base, its connection (driver and WABA / number ids, or the instance), and if it is crm. */
interface Place {
  base: string;
  env: WhatsappEnv | null;
  crm: boolean;
}

function connOf(env: WhatsappEnv): string {
  if (env.provider === 'crm') return 'crm';
  if (env.provider === 'evolution') return `evolution:${env.instance}`;
  return `${env.provider ?? 'meta'}:${env.wabaId}:${env.phoneNumberId}`;
}

function placeOf(at: HoldPlace, env: Env): Place {
  if (!at.route) {
    const crm = lineProvider(env, at.line) === 'crm';
    return { base: `line:${at.line}`, env: lineEnvs(env)[at.line], crm };
  }
  const id = at.route.numberId;
  const own = overlayNumbers()?.find((n) => n.id === id)?.env ?? null;
  return { base: `number:${id}`, env: own, crm: own?.provider === 'crm' };
}

const keyOf = (p: Place): string => {
  const conn = p.crm ? 'crm' : p.env && connOf(p.env);
  return conn ? `${p.base}:${conn}` : p.base;
};

/**
 * The outage hold's key: the line under legacy, the number in module mode (docs/23c), each with
 * its CURRENT driver and WABA / phone-number id, so a live switch starts unheld.
 */
export const laneKey = (at: HoldPlace, env: Env = loadEnv()): string => keyOf(placeOf(at, env));

/** The 131042 hold's key: laneKey, but null on the crm driver (its errors carry no 131042). */
export function holdKey(at: HoldPlace, env: Env = loadEnv()): string | null {
  const place = placeOf(at, env);
  return place.crm ? null : keyOf(place);
}
