import type { WaProvider } from '@ab/catalog';
import { isGraphEnv, type GraphEnv, type WhatsappEnv } from '@/config/env/env';
import type { DriverTraits } from './driver-record.types';

const GRAPH: DriverTraits = { paymentHold: true, fetchesMedia: true, fixedConn: null };

// The crm driver's errors carry no Meta 131042 and the CRM keeps its own files (docs/19); its
// connection is the CRM itself, so a line on it has one lane key even before it is configured.
const DRIVERS: Record<WaProvider, DriverTraits> = {
  meta: GRAPH,
  kapso: GRAPH,
  crm: { paymentHold: false, fetchesMedia: false, fixedConn: 'crm' },
  evolution: GRAPH,
};
const BY_NAME = new Map<string, DriverTraits>(Object.entries(DRIVERS));

/** A driver's traits by provider name (a number row's text); none or an unknown one is Meta. */
export const driverOf = (provider: string | null | undefined): DriverTraits =>
  BY_NAME.get(provider ?? 'meta') ?? DRIVERS.meta;

/** The driver and the ids a hold key carries, so a live driver or WABA switch starts unheld. */
export function connectionId(env: WhatsappEnv): string {
  if (isGraphEnv(env)) return graphConn(env);
  return env.provider === 'crm' ? 'crm' : `evolution:${env.instance}`;
}

const graphConn = (env: GraphEnv): string =>
  `${env.provider ?? 'meta'}:${env.wabaId}:${env.phoneNumberId}`;
