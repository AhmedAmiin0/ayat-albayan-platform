import type { Permission } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Icon, type IconName } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// The fihris (surah index) nav, docs/07 §7. Only routes that exist, never dead links.
// لوحة التحكم is the logo link (/admin); student reports open from the student profile.
const GROUPS = [
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
const MONEY_GROUP = 'payments';

// ≥900px the fihris sits on the mint (dark: green-grey) sidebar in cover ink; the current item is a
// white tile with a 4px emerald bar inset at the inline-start (right in RTL, left in LTR).
// Spacing is a 4px grid: 12px to the icon, 8px icon → label, 40px tall (44 on phones and touch).
const LINK = cn(
  'group relative flex min-h-11 min-w-0 items-center gap-2 whitespace-nowrap rounded-md px-3 font-medium text-ink-2 transition-colors duration-150 ease-out',
  'before:absolute before:inset-y-2 before:start-0 before:w-1 before:rounded-full before:bg-transparent before:transition-colors before:duration-150',
  'hover:bg-sunk hover:text-ink shell:min-h-10 shell:pointer-coarse:min-h-11 shell:text-cover-ink shell:hover:bg-leather-deep shell:hover:text-cover-ink',
  'aria-[current=page]:bg-page aria-[current=page]:font-semibold aria-[current=page]:text-ink aria-[current=page]:before:bg-lapis',
);

export type NavKey = (typeof GROUPS)[number][number]['key'];
/** A real count from the API. `act` = work waiting for the admin (saffron, says what it is). */
export type NavCount = { text: string; act?: boolean };

export interface AdminNavProps {
  /** Counts only where real data exists; a missing key renders no count. */
  counts?: Partial<Record<NavKey, NavCount>>;
  /** Dynamic roles: an item shows only when the user holds its permission (default: all shown). */
  can?: (permission: Permission) => boolean;
}

/** The groups with only the items `can` allows; empty groups dropped. */
export function visibleGroups(can: (permission: Permission) => boolean) {
  return GROUPS.map((group) => group.filter((item) => can(item.permission))).filter((group) => group.length > 0);
}

/** Sidebar list ≥900px (dot leaders + counts); a scrolling top row below (saffron counts only). */
export function AdminNav({ counts = {}, can = () => true }: AdminNavProps) {
  return (
    <nav
      aria-label={t.nav.label}
      className={cn(
        // Under 900px the nav gets a row of its own (order-last, full width) under logo + foot.
        'ab-fade-end order-last flex min-w-0 basis-full gap-1 overflow-x-auto pe-10 [scrollbar-width:none] shell:order-none shell:basis-auto',
        // Compact row: py-1 leaves room for the focus ring and ps-5 clears the start fade;
        // scroll-padding keeps the current item clear of the logo and the end fade (docs/07 §7).
        '-my-1 py-1 ps-5 [scroll-padding-inline:24px_44px]',
        'shell:my-0 shell:flex-none shell:flex-col shell:gap-4 shell:overflow-visible shell:p-0 shell:[mask-image:none]',
      )}
    >
      {visibleGroups(can).map((group) => (
        <ul
          key={group[0]?.key}
          aria-label={group[0]?.key === MONEY_GROUP ? t.finance.nav : undefined}
          className="flex shrink-0 gap-1 shell:flex-col"
        >
          {group[0]?.key === MONEY_GROUP && (
            <li aria-hidden="true" className="hidden px-3 pb-1 text-2xs font-semibold text-ink-3 shell:block shell:text-cover-ink shell:opacity-70">
              {t.finance.nav}
            </li>
          )}
          {group.map((item) => {
            const count = counts[item.key];
            return (
              <li key={item.key} className="shrink-0 shell:min-w-0 shell:shrink">
                <Link to={item.to} className={LINK}>
                  <Icon name={item.icon} className="text-ink-3 shell:text-cover-ink group-aria-[current=page]:text-lapis" />
                  <span className="shell:min-w-0 shell:whitespace-normal shell:py-1 shell:leading-snug">{item.label}</span>
                  {count && (
                    <>
                      {' '}
                      <i aria-hidden="true" className="mt-1.5 hidden h-px min-w-1.5 flex-1 border-t-[1.5px] border-dotted border-rule-strong shell:block" />
                      <span
                        className={cn(
                          'text-2xs tabular-nums',
                          count.act ? 'font-bold text-act' : 'hidden font-medium text-ink-3 shell:inline',
                        )}
                      >
                        {count.text}
                      </span>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      ))}
    </nav>
  );
}
