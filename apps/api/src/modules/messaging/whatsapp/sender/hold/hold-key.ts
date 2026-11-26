import type { WaLine } from '@ab/catalog';
import { overlayNumbers } from '@/common/configuration/integrations/numbers-overlay';
import { lineEnvs, lineProvider, loadEnv, type Env } from '@/config/env/env';
import type { WhatsappEnv } from '@/config/env/whatsapp/env.whatsapp';
import { connectionId, driverOf } from '@/modules/messaging/whatsapp/drivers/driver-record';
import type { DriverTraits } from '@/modules/messaging/whatsapp/drivers/driver-record.types';
import type { NumberRoute } from '@/modules/messaging/whatsapp/numbers/number-route';

/** Where a row leaves from, as the line hold sees it. */
export interface HoldPlace {
  line: WaLine;
  route?: NumberRoute | null;
}

/** The base, its connection (driver and WABA / number ids, or the instance), and its driver. */
interface Place {
  base: string;
  env: WhatsappEnv | null;
  driver: DriverTraits;
}

function placeOf(at: HoldPlace, env: Env): Place {
  if (!at.route) {
    const driver = driverOf(lineProvider(env, at.line));
    return { base: `line:${at.line}`, env: lineEnvs(env)[at.line], driver };
  }
  const id = at.route.numberId;
  const own = overlayNumbers()?.find((n) => n.id === id)?.env ?? null;
  return { base: `number:${id}`, env: own, driver: driverOf(own?.provider) };
}

const keyOf = (p: Place): string => {
  const conn = p.env ? connectionId(p.env) : p.driver.fixedConn;
  return conn ? `${p.base}:${conn}` : p.base;
};

/**
 * The outage hold's key: the line under legacy, the number in module mode (docs/23c), each with
 * its CURRENT driver and WABA / phone-number id, so a live switch starts unheld.
 */
export const laneKey = (at: HoldPlace, env: Env = loadEnv()): string => keyOf(placeOf(at, env));

/** The 131042 hold's key: laneKey, but null on a driver whose errors carry no 131042. */
export function holdKey(at: HoldPlace, env: Env = loadEnv()): string | null {
  const place = placeOf(at, env);
  return place.driver.paymentHold ? keyOf(place) : null;
}
