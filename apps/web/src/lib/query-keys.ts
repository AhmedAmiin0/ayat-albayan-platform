import { PUBLIC_CONFIG_QUERY_KEY } from '@ab/shared';

/**
 * The React Query keys of the settings family, named once: the academy settings (GET /settings),
 * the public config (GET /settings/public), «التكاملات», who changed what (GET /config/meta) and the
 * custom values (GET /config/custom). The values are the legacy literals; the routes keep their names.
 */
export const CONFIG_QUERY_KEYS = {
  settings: ['settings'],
  publicConfig: PUBLIC_CONFIG_QUERY_KEY,
  integrations: ['settings', 'integrations'],
  settingsMeta: ['config', 'meta'],
  customConfig: ['config', 'custom'],
} as const;
