import type { SettingDef } from '../defs.js';

/** SQL reads the renewal settings with own defaults: a default change needs a migration. */
export const SALES_SETTINGS = {
  sales_auto_assign: { module: 'sales', group: 'sales', confirm: 'simple', type: 'bool', default: true, form: false, labelKey: 'sales.assign.auto', hintKey: 'sales.assign.autoHint' },
  // Off (default) = any assistant acts on any lead or student (docs/16 row 39).
  sales_require_assignee: {
    module: 'sales', group: 'sales', confirm: 'simple', type: 'bool', default: false,
    labelKey: 'sales.assign.require', hintKey: 'sales.assign.requireHint',
  },
  renewal_commission_enabled: {
    module: 'sales', group: 'sales', type: 'bool', default: true,
    labelKey: 'sales.renewalCommission.enabledLabel', hintKey: 'sales.renewalCommission.enabledHint',
  },
  renewal_commission_percent: {
    module: 'sales', group: 'sales',
    type: 'int', default: 50, min: 0, max: 100,
    labelKey: 'sales.renewalCommission.label', hintKey: 'sales.renewalCommission.hint',
  },
} as const satisfies Record<string, SettingDef>;
