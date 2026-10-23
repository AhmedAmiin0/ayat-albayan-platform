import type { SettingDef } from '../defs.js';

/** «فريق المبيعات» (migration 187): its own switch. */
export const SALES_SETTINGS = {
  sales_auto_assign: { module: 'sales', group: 'sales', confirm: 'simple', type: 'bool', default: true, form: false, labelKey: 'sales.assign.auto', hintKey: 'sales.assign.autoHint' },
} as const satisfies Record<string, SettingDef>;
