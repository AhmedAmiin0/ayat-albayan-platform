import type { Permission } from '@ab/shared';
import type { IconName } from '@/components/ui/icon';
import { t } from '@/lib/i18n';

// The fihris (surah index) nav, docs/07 §7: the ONE list of admin pages, rendered by the sidebar
// (≥ 900px) and by the «القائمة» sheet below it; `visibleGroups` (dynamic roles) filters it once.
// Only routes that exist, never dead links. لوحة التحكم is the logo link (/admin).
export const ADMIN_NAV_GROUPS = [
  [
    { key: 'leads', to: '/admin/leads', label: t.nav.leads, icon: 'phone', permission: 'leads.read' },
    { key: 'inbox', to: '/admin/inbox', label: t.nav.inbox, icon: 'chat', permission: 'inbox.read' },
    { key: 'jobApplicants', to: '/admin/job-applicants', label: t.nav.jobApplicants, icon: 'brief', permission: 'applicants.read' },
  ],
  [
    { key: 'students', to: '/admin/students', label: t.nav.students, icon: 'users', permission: 'students.read' },
    { key: 'teachers', to: '/admin/teachers', label: t.nav.teachers, icon: 'teacher', permission: 'teachers.read' },
    { key: 'schedule', to: '/admin/schedule', label: t.schedule.nav, icon: 'calendar', permission: 'lessons.read' },
    { key: 'classrooms', to: '/admin/classrooms', label: t.classroom.admin.nav, icon: 'chat', permission: 'lessons.read' },
    { key: 'feedback', to: '/admin/feedback', label: t.nav.feedback, icon: 'star', permission: 'feedback.read' },
  ],
  // «المالية» (owner, 2026-10-05): every money page in one section, titled (see MONEY_GROUP).
  [
    { key: 'payments', to: '/admin/payments', label: t.payments.title, icon: 'card', permission: 'payments.read' },
    { key: 'subscriptions', to: '/admin/subscriptions', label: t.nav.subscriptions, icon: 'box', permission: 'subscriptions.read' },
    { key: 'payouts', to: '/admin/payouts', label: t.nav.payouts, icon: 'wallet', permission: 'payouts.read' },
    { key: 'assistants', to: '/admin/assistants', label: t.assistants.nav, icon: 'person', permission: 'assistantpay.read' },
    { key: 'expenses', to: '/admin/expenses', label: t.nav.expenses, icon: 'receipt', permission: 'expenses.read' },
    { key: 'invoices', to: '/admin/invoices', label: t.finance.invoicesTitle, icon: 'download', permission: 'invoices.read' },
    { key: 'receivables', to: '/admin/receivables', label: t.finance.receivablesTitle, icon: 'clock', permission: 'receivables.read' },
    { key: 'finance', to: '/admin/finance', label: t.finance.summaryTitle, icon: 'grid', permission: 'dashboard.read' },
  ],
  [
    { key: 'pricing', to: '/admin/pricing', label: t.pricing.title, icon: 'globe', permission: 'pricing.read' },
    { key: 'settings', to: '/admin/settings', label: t.settings.title, icon: 'sliders', permission: 'settings.read' },
    { key: 'translations', to: '/admin/translations', label: t.translations.nav, icon: 'template', permission: 'translations.manage' },
    { key: 'activity', to: '/admin/activity', label: t.nav.activity, icon: 'clock', permission: 'activity.read' },
    { key: 'roles', to: '/admin/roles', label: t.nav.roles, icon: 'users', permission: 'roles.manage' },
  ],
] as const satisfies readonly (readonly { key: string; to: string; label: string; icon: IconName; permission: Permission }[])[];

/** The group whose first key this is gets the «المالية» title. */
export const MONEY_GROUP = 'payments';

/** Every admin nav item in one flat list (the top bar's page title). */
export const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flat();

export type NavKey = (typeof ADMIN_NAV_ITEMS)[number]['key'];

/** The groups with only the items `can` allows; empty groups dropped (sidebar and sheet alike). */
export function visibleGroups(can: (permission: Permission) => boolean) {
  return ADMIN_NAV_GROUPS.map((group) => group.filter((item) => can(item.permission))).filter((group) => group.length > 0);
}
