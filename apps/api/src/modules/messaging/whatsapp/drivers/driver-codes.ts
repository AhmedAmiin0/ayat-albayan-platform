import type { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// messages.error_code of a driver's own refusal (docs/19), in its own words: a refused credential
// (the queue is held, uncounted) or the number's own safety rule (failed, never sent).

/** Kapso refused the line's project key: held like an auth error. */
export const KAPSO_AUTH = 'kapso_auth';
/** The CRM refused its API key or it lacks messages:send: held the same way. */
export const CRM_AUTH = 'crm_auth';
/** Evolution refused the instance token, or the instance is gone / logged out: held too. */
export const EVOLUTION_AUTH = 'evolution_auth';
/** A job's row refused on an Evolution Baileys number with automatic sends off. */
const EVOLUTION_AUTO_OFF = 'evolution_auto_off';

type Own = NonNullable<WaError['info']['credential'] | WaError['info']['blocked']>;

const DRIVER_CODE = {
  kapso: KAPSO_AUTH,
  crm: CRM_AUTH,
  evolution: EVOLUTION_AUTH,
  evolution_auto_off: EVOLUTION_AUTO_OFF,
} satisfies Record<Own, string>;

/** The driver's own code of this error; null = none (Meta's code or the failure kind decides). */
export function driverCode(info: WaError['info']): string | null {
  const own = info.credential ?? info.blocked;
  return own ? DRIVER_CODE[own] : null;
}
