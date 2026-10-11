import type { SettingDef } from './types.js';

const h = 'settings.hints';

/** «التقارير» (R-RPT-02) and «الحسابات والدفعات» (R-SUB-02, R-REP-02, R-PAY-02, docs/08 §4). */
export const REPORTS_SETTINGS = {
  report_teacher_edit_hours: {
    section: 'reports', type: 'int', default: 24, min: 0, max: 168,
    labelKey: 'settings.reportTeacherEditHours', hintKey: `${h}.reportTeacherEditHours`,
  },
} as const satisfies Record<string, SettingDef>;

export const ACCOUNTS_SETTINGS = {
  reporting_currency: { section: 'accounts', type: 'currency', default: 'SAR', labelKey: 'settings.reportingCurrency', hintKey: `${h}.reportingCurrency` },
  renewal_alert_remaining: {
    section: 'accounts', type: 'int', default: 2, min: 0, max: 10,
    labelKey: 'settings.renewalAlertRemaining', hintKey: `${h}.renewalAlertRemaining`,
  },
  flag_future_lessons_when_unpaid: {
    section: 'accounts', type: 'bool', default: true,
    labelKey: 'settings.flagFutureLessonsWhenUnpaid', hintKey: `${h}.flagFutureLessonsWhenUnpaid`,
  },
  payout_count_late: { section: 'accounts', type: 'bool', default: false, labelKey: 'settings.payoutCountLate', hintKey: `${h}.payoutCountLate` },
  payout_count_no_show: { section: 'accounts', type: 'bool', default: false, labelKey: 'settings.payoutCountNoShow', hintKey: `${h}.payoutCountNoShow` },
  payout_count_trials: { section: 'accounts', type: 'bool', default: false, labelKey: 'settings.payoutCountTrials' },
  /** A stored exchange rate younger than this is reused; older ones are fetched again. */
  fx_fresh_hours: {
    section: 'accounts', type: 'int', default: 24, min: 1, max: 168,
    labelKey: 'settings.fxFreshHours', hintKey: `${h}.fxFreshHours`,
  },
} as const satisfies Record<string, SettingDef>;

/** «الملفات المرفوعة»: one limit for receipts and booking invoices, at most the buckets' 10 MB (migrations 122, 170). */
export const UPLOADS_SETTINGS = {
  upload_max_mb: {
    section: 'uploads', type: 'int', default: 10, min: 1, max: 10, public: true,
    labelKey: 'settings.uploadMaxMb', hintKey: `${h}.uploadMaxMb`,
  },
} as const satisfies Record<string, SettingDef>;

/** «الأكاديمية»: contact number, the academy's time zone, and the public form's rate limit. */
export const ACADEMY_SETTINGS = {
  academy_whatsapp_e164: {
    section: 'academy', type: 'e164', default: '+966566101447', public: true,
    labelKey: 'settings.academyWhatsapp', hintKey: `${h}.academyWhatsapp`,
  },
  academy_timezone: {
    section: 'academy', type: 'tz', default: 'Asia/Riyadh',
    labelKey: 'settings.academyTimezone', hintKey: `${h}.academyTimezone`,
  },
  feedback_rate_window_min: {
    section: 'academy', type: 'int', default: 10, min: 1, max: 120,
    labelKey: 'settings.feedbackRateWindowMin', hintKey: `${h}.feedbackRateWindowMin`,
  },
} as const satisfies Record<string, SettingDef>;

/** «فريق المبيعات» (migration 187): its own switch. */
export const SALES_SETTINGS = {
  sales_auto_assign: { section: 'sales', type: 'bool', default: true, form: false, labelKey: 'sales.assign.auto', hintKey: 'sales.assign.autoHint' },
} as const satisfies Record<string, SettingDef>;
