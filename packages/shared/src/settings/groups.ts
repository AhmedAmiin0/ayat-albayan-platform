/**
 * «القيم» page groups (docs/26b §2), one per view. The first ten hold the 28 CONFIG keys of docs/26 §1;
 * the last three are «تُدار من صفحة أخرى»: rows shown read-only that their module page edits.
 */
export const CONFIG_GROUPS = [
  'schedule', 'classroom', 'reports', 'accounts', 'payouts', 'uploads', 'academy', 'messaging', 'sales', 'retention',
] as const;
export const MODULE_GROUPS = ['notifications', 'safety', 'google'] as const;
export const SETTING_GROUPS = [...CONFIG_GROUPS, ...MODULE_GROUPS] as const;
export type SettingGroup = (typeof SETTING_GROUPS)[number];

/** A per-value confirmation the registry declares (docs/26 §1 rule 5): a plain one, or the typed text. */
export const SETTING_CONFIRMS = ['simple', 'typed'] as const;
export type SettingConfirm = (typeof SETTING_CONFIRMS)[number];
