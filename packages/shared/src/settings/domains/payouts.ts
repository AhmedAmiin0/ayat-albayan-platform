import type { SettingDef } from '../defs.js';

const h = 'settings.hints';

/**
 * Teacher payouts (R-PAY-02): which lessons count. SQL teacher_pay_rule() reads these three keys
 * with its own coalesce defaults (migration 20261005000200): a default change needs a migration too.
 */
export const PAYOUT_SETTINGS = {
  payout_count_late: { type: 'bool', default: false, labelKey: 'settings.payoutCountLate', hintKey: `${h}.payoutCountLate` },
  payout_count_no_show: { type: 'bool', default: false, labelKey: 'settings.payoutCountNoShow', hintKey: `${h}.payoutCountNoShow` },
  payout_count_trials: { type: 'bool', default: false, labelKey: 'settings.payoutCountTrials' },
} as const satisfies Record<string, SettingDef>;
