import type { SettingDef } from '../../defs.js';

const h = 'settings.hints';

/** Money reports (R-REP-02, docs/08 §4): the reporting currency and how long an exchange rate stays fresh. */
export const FINANCE_SETTINGS = {
  reporting_currency: { module: 'finance', group: 'accounts', type: 'currency', default: 'SAR', labelKey: 'settings.reportingCurrency', hintKey: `${h}.reportingCurrency` },
  /** A stored exchange rate younger than this is reused; older ones are fetched again. */
  fx_fresh_hours: {
    module: 'finance', group: 'accounts',
    type: 'int', default: 24, min: 1, max: 168,
    labelKey: 'settings.fxFreshHours', hintKey: `${h}.fxFreshHours`,
  },
} as const satisfies Record<string, SettingDef>;
