import type { WaLine } from '../enums/messaging';
import type { IntegrationKey, WaProvider } from './keys';
import type { IntegrationConfigItem } from './views.schemas';

// Keys each driver needs (docs/19), by name; the API's lineGaps (env.gaps.ts) has the final word.

const CRM_KEYS: readonly IntegrationKey[] = ['WACRM_API_BASE', 'WACRM_API_KEY'];
const KAPSO_KEYS: readonly IntegrationKey[] = ['KAPSO_API_BASE', 'KAPSO_API_KEY'];
/** An Evolution number's instance and token live on the number; only the base lives here. */
const EVOLUTION_KEYS: readonly IntegrationKey[] = ['EVOLUTION_API_BASE'];
const NOTIFICATION_IDS: readonly IntegrationKey[] = ['WA_PHONE_NUMBER_ID', 'WA_WABA_ID'];
const CHAT_IDS: readonly IntegrationKey[] = ['WA_CHAT_PHONE_NUMBER_ID', 'WA_CHAT_WABA_ID'];

/** The keys a line on `provider` sends with: crm its base and key; kapso the line's ids and the project key; meta the line's ids, base and token. */
export function driverKeys(provider: WaProvider, line: WaLine): IntegrationKey[] {
  const ids = line === 'chat' ? CHAT_IDS : NOTIFICATION_IDS;
  if (provider === 'crm') return [...CRM_KEYS];
  if (provider === 'evolution') return [...EVOLUTION_KEYS];
  if (provider === 'kapso') return [...ids, ...KAPSO_KEYS];
  return ['WA_API_BASE', ...ids, line === 'chat' ? 'WA_CHAT_ACCESS_TOKEN' : 'WA_ACCESS_TOKEN'];
}

/** The NAMES of the keys `provider` still lacks on `line`, read from GET /settings/integrations (never a value). */
export function driverMissing(input: { provider: WaProvider; line: WaLine; items: readonly Pick<IntegrationConfigItem, 'key' | 'set'>[] }): IntegrationKey[] {
  const set = new Set(input.items.filter((i) => i.set).map((i) => i.key));
  return driverKeys(input.provider, input.line).filter((k) => !set.has(k));
}
