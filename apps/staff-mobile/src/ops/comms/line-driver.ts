import {
  WA_LINE_PROVIDERS,
  type IntegrationConfigItem,
  type WaLine,
  type WaProvider,
} from '@ab/catalog';
import { t } from '@ab/mobile-kit';

// docs/19: the same key the web's integrations page saves.

const LINE_DRIVER_KEY = { notifications: 'WA_PROVIDER', chat: 'WA_CHAT_PROVIDER' } as const satisfies Record<WaLine, string>;

/** The drivers a line may be switched to by hand (never evolution: a number's driver only). */
export type LineProvider = (typeof WA_LINE_PROVIDERS)[number];
export const LINE_PROVIDERS: readonly LineProvider[] = WA_LINE_PROVIDERS;

const isProvider = (v: string | null | undefined): v is LineProvider =>
  WA_LINE_PROVIDERS.some((p) => p === v);

/** The line's driver in use (the database's value, else the server's, else meta: the default). */
export function lineDriver(items: readonly Pick<IntegrationConfigItem, 'key' | 'value'>[], line: WaLine): LineProvider {
  const value = items.find((i) => i.key === LINE_DRIVER_KEY[line])?.value;
  return isProvider(value) ? value : 'meta';
}

export const driverName = (p: WaProvider): string => t.integrations.options[p];

/** PUT /settings/integrations body: only this line's key (the API audits it like the web's save). */
export const driverValues = (line: WaLine, provider: WaProvider) => ({ values: { [LINE_DRIVER_KEY[line]]: provider } });
