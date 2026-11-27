import { z } from 'zod';

/** Values page groups (docs/26b §2); the last three are read-only rows their module page edits. */
export const CONFIG_GROUPS = [
  'schedule', 'classroom', 'reports', 'accounts', 'payouts', 'uploads', 'academy', 'messaging', 'sales', 'retention',
  'teachers', 'family', 'system',
] as const;
export const MODULE_GROUPS = ['notifications', 'safety', 'google'] as const;
export const SETTING_GROUPS = [...CONFIG_GROUPS, ...MODULE_GROUPS] as const;
export const settingGroupSchema = z.enum(SETTING_GROUPS);
export type SettingGroup = z.infer<typeof settingGroupSchema>;

/** A per-value confirmation the registry declares (docs/26 §1 rule 5): a plain one, or the typed text. */
export const SETTING_CONFIRMS = ['simple', 'typed'] as const;
export const settingConfirmSchema = z.enum(SETTING_CONFIRMS);
export type SettingConfirm = z.infer<typeof settingConfirmSchema>;
