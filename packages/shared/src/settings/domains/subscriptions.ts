import type { SettingDef } from '../defs.js';

const h = 'settings.hints';

/**
 * Subscriptions and renewals (R-SUB-02). SQL reads renewal_alert_remaining with its own coalesce
 * default (student list filters, migration 20261005000100): a default change needs a migration too.
 */
export const SUBSCRIPTION_SETTINGS = {
  renewal_alert_remaining: {
    type: 'int', default: 2, min: 0, max: 10,
    labelKey: 'settings.renewalAlertRemaining', hintKey: `${h}.renewalAlertRemaining`,
  },
  /** Days a student stays «بانتظار التجديد» before «انتهى الاشتراك» (owner 2026-10-15). */
  subscription_expiry_days: {
    type: 'int', default: 7, min: 1, max: 90,
    labelKey: 'settings.subscriptionExpiryDays', hintKey: `${h}.subscriptionExpiryDays`,
  },
  flag_future_lessons_when_unpaid: {
    type: 'bool', default: true,
    labelKey: 'settings.flagFutureLessonsWhenUnpaid', hintKey: `${h}.flagFutureLessonsWhenUnpaid`,
  },
} as const satisfies Record<string, SettingDef>;
