import { INTEGRATION_KEYS, type IntegrationGroup } from '@ab/shared';
import { matchesIntegration } from './integrations-form';

// Where each integrations group is edited (docs/26b §3, §6a 10.1–10.21; docs/23 phase 6): the WhatsApp
// test guards and Kapso on «التواصل» › «الحماية», the old WhatsApp line rows folded on «الأرقام»
// (still read while comms_source = legacy), and the rest on «التكاملات».

/** «الحماية»'s first column: the test guards (allow-list, template sync). */
export const SAFETY_GUARD_GROUPS: readonly IntegrationGroup[] = ['wa_safety'];

/** «الحماية»'s second column: Kapso. */
export const KAPSO_GROUPS: readonly IntegrationGroup[] = ['kapso'];

/** «التواصل» › «الحماية»: the allow-list, the template sync, Kapso. */
export const SAFETY_GROUPS: readonly IntegrationGroup[] = [...SAFETY_GUARD_GROUPS, ...KAPSO_GROUPS];

/** «التواصل» › «الأرقام» › «إعداد الخطوط السابق»: the two legacy WhatsApp lines. */
export const LEGACY_LINE_GROUPS: readonly IntegrationGroup[] = ['wa_notifications', 'wa_chat'];

/** «التكاملات»: everything that is not messaging. */
export const INTEGRATIONS_PAGE_GROUPS: readonly IntegrationGroup[] = ['livekit', 'expo', 'web_push', 'fx', 'google'];

/** Does the search match a key of these groups (label, hint or name)? Static: no fetch. */
export const groupsMatch =
  (groups: readonly IntegrationGroup[]) =>
  (query: string): boolean =>
    INTEGRATION_KEYS.some((d) => groups.includes(d.group) && matchesIntegration(d.key, query));
