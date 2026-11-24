import { PUBLIC_CONFIG_QUERY_KEY } from '@ab/settings';

/** Keys of the settings family, named once; values are legacy literals: add keys, never rename. */
export const CONFIG_QUERY_KEYS = {
  settings: ['settings'],
  publicConfig: PUBLIC_CONFIG_QUERY_KEY,
  integrations: ['settings', 'integrations'],
  settingsMeta: ['config', 'meta'],
  customConfig: ['config', 'custom'],
  entries: ['config', 'entries'],
} as const;

/** The numbers and parity query keys (docs/23 §3 phase 3). */
export const NUMBERS_QUERY_KEYS = {
  numbers: ['admin', 'numbers'],
  parity: ['admin', 'communications', 'parity'],
  ownTraffic: ['admin', 'numbers', 'own-traffic'],
} as const;
