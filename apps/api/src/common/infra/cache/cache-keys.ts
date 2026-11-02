/**
 * What the shared cache invalidates (docs/09 «Shared cache»). A topic is announced to every API copy
 * and the worker after a write; each subscriber drops its own in-process copy.
 * - settings: the `settings` table (ConfigStore, SettingsService, the rules reader, GoogleSettings)
 * - integrations / numbers: the integration overlay and the numbers' line config (values never in Redis)
 * - permissions: every user's resolved permission set
 * - rules: notification_rules rows · templates: message_templates · custom-config: its public rows
 */
export type CacheTopic = 'settings' | 'integrations' | 'numbers' | 'permissions' | 'rules' | 'templates' | 'custom-config';

/** Keys of the values kept in Redis. Never a secret: Vault values and tokens stay in each process. */
export const CACHE_KEYS = {
  /** settings rows (key, value) as SettingsService reads them; TTL = SETTINGS_CACHE_MS. */
  settingsRows: 'settings:rows',
  /** custom_config rows flagged public (readable by anyone anyway). */
  customPublic: 'custom-config:public',
} as const;

/** One user's permission set (ids and permission names only), TTL PERMISSION_TTL_MS. */
export const PERMISSION_PREFIX = 'perm:';
export const permissionKey = (userId: string): string => `${PERMISSION_PREFIX}${userId}`;
