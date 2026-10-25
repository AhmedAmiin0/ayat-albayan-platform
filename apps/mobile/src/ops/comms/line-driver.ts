import { WA_PROVIDERS, type IntegrationConfigItem, type WaLine, type WaProvider } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

// The per-line driver switch on the phone (docs/19), the same key the web's «التكاملات» saves.

export const LINE_DRIVER_KEY = { notifications: 'WA_PROVIDER', chat: 'WA_CHAT_PROVIDER' } as const satisfies Record<WaLine, string>;

const isProvider = (v: string | null | undefined): v is WaProvider => WA_PROVIDERS.some((p) => p === v);

/** The line's driver in use (the database's value, else the server's, else meta: the default). */
export function lineDriver(items: readonly Pick<IntegrationConfigItem, 'key' | 'value'>[], line: WaLine): WaProvider {
  const value = items.find((i) => i.key === LINE_DRIVER_KEY[line])?.value;
  return isProvider(value) ? value : 'meta';
}

/** «Meta مباشرة» / «Kapso» / «نظام CRM» (the web select's words). */
export const driverName = (p: WaProvider): string => t.integrations.options[p];

/** PUT /settings/integrations body: only this line's key (the API audits it like the web's save). */
export const driverValues = (line: WaLine, provider: WaProvider) => ({ values: { [LINE_DRIVER_KEY[line]]: provider } });
