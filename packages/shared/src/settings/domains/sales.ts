import type { SettingDef } from '../defs.js';

/**
 * «فريق المبيعات» (migration 187): its own switch. «نسبة عمولة التجديد» (owner 2026-10-26): the share of
 * the assistant's normal commission she earns on each renewal; SQL reads it (renewal_commission_share,
 * migration 20261027000751) with its own coalesce default: a default change needs a migration too.
 */
export const SALES_SETTINGS = {
  sales_auto_assign: { module: 'sales', group: 'sales', confirm: 'simple', type: 'bool', default: true, form: false, labelKey: 'sales.assign.auto', hintKey: 'sales.assign.autoHint' },
  renewal_commission_percent: {
    module: 'sales', group: 'sales',
    type: 'int', default: 50, min: 0, max: 100,
    labelKey: 'sales.renewalCommission.label', hintKey: 'sales.renewalCommission.hint',
  },
} as const satisfies Record<string, SettingDef>;
