import { WA_LINES, type ImportField, type IntegrationKey, type NumberSecretName, type WaLine } from '@ab/shared';
import type { NumbersOverlay } from '../../../common/integrations/numbers-overlay';
import { validOverlay } from '../../../config/env/env';

// Each role's legacy line keys (docs/23a §A3), the bridge between a number record and today's config:
// module mode fills exactly these keys from the role's default number; the import reads them.

export const ROLE_KEYS: Record<WaLine, Record<ImportField, IntegrationKey>> = {
  notifications: {
    provider: 'WA_PROVIDER',
    phone_number_id: 'WA_PHONE_NUMBER_ID',
    waba_id: 'WA_WABA_ID',
    app_id: 'WA_APP_ID',
    access_token: 'WA_ACCESS_TOKEN',
    app_secret: 'WA_APP_SECRET',
  },
  chat: {
    provider: 'WA_CHAT_PROVIDER',
    phone_number_id: 'WA_CHAT_PHONE_NUMBER_ID',
    waba_id: 'WA_CHAT_WABA_ID',
    app_id: 'WA_CHAT_APP_ID',
    access_token: 'WA_CHAT_ACCESS_TOKEN',
    app_secret: 'WA_CHAT_APP_SECRET',
  },
};

/** Every per-line key module mode owns (blank = unset when a role has no default number). */
export const LINE_KEYS: readonly IntegrationKey[] = WA_LINES.flatMap((role) => Object.values(ROLE_KEYS[role]));

/** What module mode needs of a role's default enabled number. */
export interface DefaultNumber {
  id: string;
  purpose: WaLine;
  provider: string;
  phone_number_id: string;
  waba_id: string | null;
  app_id: string | null;
  secrets: Partial<Record<NumberSecretName, string>>;
}

function roleValues(n: DefaultNumber): Record<string, string> {
  const k = ROLE_KEYS[n.purpose];
  return {
    [k.provider]: n.provider,
    [k.phone_number_id]: n.phone_number_id,
    [k.waba_id]: n.waba_id ?? '',
    [k.app_id]: n.app_id ?? '',
    [k.access_token]: n.secrets.access_token ?? '',
    [k.app_secret]: n.secrets.app_secret ?? '',
  };
}

/**
 * The numbers overlay of module mode: every line key, blank unless the role's default number sets it.
 * Each value is checked against its key's env schema; a bad one is blanked and `onBad` gets its KEY.
 */
export function moduleOverlay(defaults: readonly DefaultNumber[], onBad: (key: string) => void): NumbersOverlay {
  const blank = Object.fromEntries(LINE_KEYS.map((key) => [key, '']));
  const raw = Object.assign({}, ...defaults.map(roleValues)) as Record<string, string>;
  const values = { ...blank, ...validOverlay(raw, onBad) };
  const numberIds = Object.fromEntries(defaults.map((n) => [n.purpose, n.id])) as NumbersOverlay['numberIds'];
  return { values, numberIds };
}
