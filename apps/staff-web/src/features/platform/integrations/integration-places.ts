import { INTEGRATION_KEYS, type IntegrationGroup } from '@ab/catalog';
import { matchesIntegration } from './integrations-form';

// Legacy line rows are read while comms_source is legacy (docs/26b §3, docs/23 phase 6).

export const SAFETY_GUARD_GROUPS: readonly IntegrationGroup[] = ['wa_safety'];

export const KAPSO_GROUPS: readonly IntegrationGroup[] = ['kapso'];

/** docs/19 crm driver. */
export const WACRM_GROUPS: readonly IntegrationGroup[] = ['wacrm'];

/** docs/19. */
export const EVOLUTION_GROUPS: readonly IntegrationGroup[] = ['evolution'];

export const SAFETY_GROUPS: readonly IntegrationGroup[] = [
  ...SAFETY_GUARD_GROUPS,
  ...KAPSO_GROUPS,
  ...WACRM_GROUPS,
  ...EVOLUTION_GROUPS,
];

export const LEGACY_LINE_GROUPS: readonly IntegrationGroup[] = ['wa_notifications', 'wa_chat'];

/** Stripe is listed whenever the API runs with FEATURE_STRIPE. */
export const INTEGRATIONS_PAGE_GROUPS: readonly IntegrationGroup[] = [
  'calls',
  'livekit',
  'expo',
  'web_push',
  'fx',
  'google',
  'giphy',
  'storage',
  'stripe',
];

/** Does the search match a key of these groups (label, hint or name)? Static: no fetch. */
export const groupsMatch =
  (groups: readonly IntegrationGroup[]) =>
  (query: string): boolean =>
    INTEGRATION_KEYS.some((d) => groups.includes(d.group) && matchesIntegration(d.key, query));
