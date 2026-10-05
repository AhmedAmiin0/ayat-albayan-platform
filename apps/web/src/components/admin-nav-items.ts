import type { IconName } from '@/components/ui/icon';
import { t } from '@/lib/i18n';

// The fihris (surah index) nav, docs/07 §7: the ONE list of admin pages, rendered by the sidebar
// (≥ 900px) and by the «القائمة» sheet below it, so a later permissions filter hides an item once.
// Only routes that exist, never dead links. لوحة التحكم is the logo link (/admin).
export const ADMIN_NAV_GROUPS = [
  [
    { key: 'leads', to: '/admin/leads', label: t.nav.leads, icon: 'phone' },
    { key: 'inbox', to: '/admin/inbox', label: t.nav.inbox, icon: 'chat' },
    { key: 'jobApplicants', to: '/admin/job-applicants', label: t.nav.jobApplicants, icon: 'brief' },
  ],
  [
    { key: 'students', to: '/admin/students', label: t.nav.students, icon: 'users' },
    { key: 'teachers', to: '/admin/teachers', label: t.nav.teachers, icon: 'teacher' },
    { key: 'schedule', to: '/admin/schedule', label: t.schedule.nav, icon: 'calendar' },
    { key: 'classrooms', to: '/admin/classrooms', label: t.classroom.admin.nav, icon: 'chat' },
    { key: 'feedback', to: '/admin/feedback', label: t.nav.feedback, icon: 'star' },
  ],
  // «المالية» (owner, 2026-10-05): every money page in one section, titled (see MONEY_GROUP).
  [
    { key: 'payments', to: '/admin/payments', label: t.payments.title, icon: 'card' },
    { key: 'subscriptions', to: '/admin/subscriptions', label: t.nav.subscriptions, icon: 'box' },
    { key: 'payouts', to: '/admin/payouts', label: t.nav.payouts, icon: 'wallet' },
    { key: 'expenses', to: '/admin/expenses', label: t.nav.expenses, icon: 'receipt' },
    { key: 'invoices', to: '/admin/invoices', label: t.finance.invoicesTitle, icon: 'download' },
    { key: 'receivables', to: '/admin/receivables', label: t.finance.receivablesTitle, icon: 'clock' },
    { key: 'finance', to: '/admin/finance', label: t.finance.summaryTitle, icon: 'grid' },
  ],
  [
    { key: 'pricing', to: '/admin/pricing', label: t.pricing.title, icon: 'globe' },
    { key: 'settings', to: '/admin/settings', label: t.settings.title, icon: 'sliders' },
    { key: 'translations', to: '/admin/translations', label: t.translations.nav, icon: 'template' },
    { key: 'activity', to: '/admin/activity', label: t.nav.activity, icon: 'clock' },
  ],
] as const satisfies readonly (readonly { key: string; to: string; label: string; icon: IconName }[])[];

/** The group whose first key this is gets the «المالية» title. */
export const MONEY_GROUP = 'payments';

/** Every admin nav item in one flat list (the top bar's page title). */
export const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flat();

export type NavKey = (typeof ADMIN_NAV_ITEMS)[number]['key'];
