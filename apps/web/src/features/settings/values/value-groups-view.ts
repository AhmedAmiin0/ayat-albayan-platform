import {
  OWNED_VALUE_GROUPS,
  VALUE_GROUP_IDS,
  VALUE_GROUPS,
  type OwnedValueGroupId,
  type SettingKey,
  type ValueGroupId,
} from '@ab/shared';
import { t } from '@/lib/i18n';

// «القيم»'s group list (docs/26b §2): the editable groups, «قيم مخصصة», then under «تُدار من صفحة
// أخرى» the module-owned views. «الكل» is not a group: it is only the result of a search or filter.

export type ValuesGroupId = ValueGroupId | 'custom' | OwnedValueGroupId;

/** The views under «تُدار من صفحة أخرى» (read-only rows). */
export const OWNED_GROUP_IDS: readonly OwnedValueGroupId[] = ['notifications', 'sending', 'google'];

/** Every group in list order. */
export const GROUP_IDS: readonly ValuesGroupId[] = [...VALUE_GROUP_IDS, 'custom', ...OWNED_GROUP_IDS];

export const isOwnedGroup = (id: ValuesGroupId): id is OwnedValueGroupId =>
  (OWNED_GROUP_IDS as readonly string[]).includes(id);

/** `?group=` → a known group; a missing or unknown one opens the first group. */
export function resolveGroup(raw: string | undefined): ValuesGroupId {
  const hit = GROUP_IDS.find((id) => id === raw);
  return hit ?? GROUP_IDS[0] ?? 'schedule';
}

const SECTION_LABEL: Partial<Record<ValuesGroupId, string>> = {
  schedule: t.settings.sections.schedule,
  classroom: t.settings.sections.classroom,
  reports: t.settings.sections.reports,
  accounts: t.settings.sections.accounts,
  uploads: t.settings.sections.uploads,
  academy: t.settings.sections.academy,
  sales: t.settings.sections.sales,
  custom: t.config.sections.custom,
};

const g = t.settingsValues.groups;
const NEW_LABEL: Partial<Record<ValuesGroupId, string>> = {
  payouts: g.payouts,
  messages: g.messages,
  retention: g.retention,
  notifications: g.notifications,
  sending: g.sending,
  google: g.google,
};

/** The group's name (today's section words where they exist). */
export const groupLabel = (id: ValuesGroupId): string => SECTION_LABEL[id] ?? NEW_LABEL[id] ?? id;

/** The settings rows of a group (none for «قيم مخصصة» and Google, which are not settings rows). */
export function groupKeys(id: ValuesGroupId): readonly SettingKey[] {
  if (id === 'custom' || id === 'google') return [];
  if (id === 'notifications' || id === 'sending') return OWNED_VALUE_GROUPS[id];
  return VALUE_GROUPS[id];
}

/** Where a module-owned group is edited, and the link's words. */
export const OWNER_PAGE: Record<OwnedValueGroupId, { to: string; label: string }> = {
  notifications: { to: '/admin/settings/communications', label: t.settingsValues.editFrom.communications },
  sending: { to: '/admin/settings/communications', label: t.settingsValues.editFrom.communications },
  google: { to: '/admin/settings/google', label: t.settingsValues.editFrom.google },
};

/** Which group a settings key is listed in (the «الكل» results name it under each label). */
export function groupOfKey(key: SettingKey): ValuesGroupId | undefined {
  return GROUP_IDS.find((id) => groupKeys(id).includes(key));
}
