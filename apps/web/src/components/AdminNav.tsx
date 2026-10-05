import { Link } from '@tanstack/react-router';
import { Icon, type IconName } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// The fihris (surah index) nav, docs/07 §7. Only routes that exist, never dead links.
// لوحة التحكم is the logo link (/admin); student reports open from the student profile.
const GROUPS = [
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
  ],
] as const satisfies readonly (readonly { key: string; to: string; label: string; icon: IconName }[])[];

/** The group whose first key this is gets the «المالية» title. */
const MONEY_GROUP = 'payments';

export type NavKey = (typeof GROUPS)[number][number]['key'];
/** A real count from the API. `act` = work waiting for the admin (saffron, says what it is). */
export type NavCount = { text: string; act?: boolean };

export interface AdminNavProps {
  /** Counts only where real data exists; a missing key renders no count. */
  counts?: Partial<Record<NavKey, NavCount>>;
}

/** Sidebar list ≥900px (dot leaders + counts); a scrolling top row below (saffron counts only). */
export function AdminNav({ counts = {} }: AdminNavProps) {
  return (
    <nav
      aria-label={t.nav.label}
      className={cn(
        // Under 900px the nav gets a row of its own (order-last, full width) under logo + foot.
        'ab-fade-end order-last flex min-w-0 basis-full gap-0.5 overflow-x-auto pe-10 [scrollbar-width:none] shell:order-none shell:basis-auto',
        // Compact row: py-1 leaves room for the focus ring and ps-5 clears the start fade;
        // scroll-padding keeps the current item clear of the logo and the end fade (docs/07 §7).
        '-my-1 py-1 ps-5 [scroll-padding-inline:24px_44px]',
        'shell:my-0 shell:flex-none shell:flex-col shell:gap-3.5 shell:overflow-visible shell:p-0 shell:[mask-image:none]',
      )}
    >
      {GROUPS.map((group) => (
        <ul
          key={group[0].key}
          aria-label={group[0].key === MONEY_GROUP ? t.finance.nav : undefined}
          className="flex gap-0.5 shell:flex-col"
        >
          {group[0].key === MONEY_GROUP && (
            <li aria-hidden="true" className="hidden px-2.5 pt-1 text-2xs font-semibold text-ink-3 shell:block">
              {t.finance.nav}
            </li>
          )}
          {group.map((item) => {
            const count = counts[item.key];
            return (
              <li key={item.key}>
                <Link
                  to={item.to}
                  className="group flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md px-2.5 font-medium text-ink-2 hover:bg-sunk hover:text-ink aria-[current=page]:bg-page aria-[current=page]:font-semibold aria-[current=page]:text-ink aria-[current=page]:shadow-[0_0_0_1px_var(--rule-strong)] shell:min-h-[38px]"
                >
                  <Icon name={item.icon} className="text-ink-3 group-aria-[current=page]:text-lapis" />
                  <span>{item.label}</span>
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
