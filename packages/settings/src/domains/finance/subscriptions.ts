import type { SettingDef } from '../../defs.js';

const h = 'settings.hints';

/**
 * Subscriptions and renewals (R-SUB-02). SQL reads renewal_alert_remaining with its own coalesce
 * default (student list filters, migration 20261005000100): a default change needs a migration too.
 */
export const SUBSCRIPTION_SETTINGS = {
  renewal_alert_remaining: {
    module: 'subscriptions', group: 'accounts', reachesFamilies: true,
    type: 'int', default: 2, min: 0, max: 10,
    labelKey: 'settings.renewalAlertRemaining', hintKey: `${h}.renewalAlertRemaining`,
  },
  /** Days a student stays «بانتظار التجديد» before «انتهى الاشتراك» (owner 2026-10-15). */
  subscription_expiry_days: {
    module: 'subscriptions', group: 'accounts',
    type: 'int', default: 7, min: 1, max: 90,
    labelKey: 'settings.subscriptionExpiryDays', hintKey: `${h}.subscriptionExpiryDays`,
  },
  flag_future_lessons_when_unpaid: {
    module: 'subscriptions', group: 'accounts',
    type: 'bool', default: true,
    labelKey: 'settings.flagFutureLessonsWhenUnpaid', hintKey: `${h}.flagFutureLessonsWhenUnpaid`,
  },
  /**
   * «إلغاء مع استرداد» (owner 2026-11-02): each attended lesson costs this percent of the package's
   * per-lesson price. The API only (no SQL reader): no migration.
   */
  refund_attended_rate_percent: {
    module: 'subscriptions', group: 'accounts',
    type: 'int', default: 100, min: 0, max: 300,
    labelKey: 'settings.refundAttendedRate', hintKey: `${h}.refundAttendedRate`,
  },
} as const satisfies Record<string, SettingDef>;
