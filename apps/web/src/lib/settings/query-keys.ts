import { PUBLIC_CONFIG_QUERY_KEY } from '@ab/shared';

/**
 * The React Query keys of the settings family, named once: the academy settings (GET /settings),
 * the public config (GET /settings/public), «التكاملات», who changed what (GET /config/meta) and the
 * custom values (GET /config/custom), and the entries (GET /config/entries, 26-P2). The values are the
 * legacy literals; the routes keep their names. Add keys here, never rename one.
 */
export const CONFIG_QUERY_KEYS = {
  settings: ['settings'],
  publicConfig: PUBLIC_CONFIG_QUERY_KEY,
  integrations: ['settings', 'integrations'],
  settingsMeta: ['config', 'meta'],
  customConfig: ['config', 'custom'],
  entries: ['config', 'entries'],
} as const;

/** «الأرقام» (docs/23 §3 phase 3): the numbers (GET /admin/numbers) and the parity (GET /admin/communications/parity). */
export const NUMBERS_QUERY_KEYS = {
  numbers: ['admin', 'numbers'],
  parity: ['admin', 'communications', 'parity'],
} as const;
