import { Link } from '@tanstack/react-router';
import { Icon, type IconName } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// The teacher's own pages (R-TCH-03), the same order as the mobile tabs.
const ITEMS = [
  { to: '/teacher', label: t.teacherNav.today, icon: 'clock', exact: true },
  { to: '/teacher/calendar', label: t.teacherNav.calendar, icon: 'calendar', exact: false },
  { to: '/teacher/inbox', label: t.nav.conversations, icon: 'chat', exact: false },
  { to: '/teacher/reports', label: t.teacherNav.reports, icon: 'receipt', exact: false },
  { to: '/teacher/payouts', label: t.teacherNav.payouts, icon: 'wallet', exact: false },
  { to: '/teacher/feedback', label: t.teacherNav.feedback, icon: 'star', exact: false },
] as const satisfies readonly { to: string; label: string; icon: IconName; exact: boolean }[];

/**
 * A fixed bottom bar on phones (six icon + word tabs, 56px, like the mobile app), a row of 48px
 * links under the logo from sm up (docs/07 §7). TopBarLayout leaves room under the page for it.
 */
export function TeacherNav() {
  return (
    <nav
      aria-label={t.teacherNav.label}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-rule-strong bg-page pb-[env(safe-area-inset-bottom)] sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:pb-0"
    >
      <ul className="grid grid-cols-6 sm:flex sm:gap-1">
        {ITEMS.map((item) => (
          <li key={item.to} className="min-w-0">
            <Link
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className={cn(
                'group flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-2xs font-medium text-ink-2 hover:text-ink',
                'sm:min-h-12 sm:flex-row sm:gap-2 sm:whitespace-nowrap sm:rounded-md sm:px-3 sm:text-base sm:hover:bg-sunk',
                'aria-[current=page]:font-semibold aria-[current=page]:text-ink',
                'sm:aria-[current=page]:bg-page sm:aria-[current=page]:shadow-[0_0_0_1px_var(--rule-strong)]',
              )}
            >
              <Icon name={item.icon} className="text-ink-3 group-aria-[current=page]:text-lapis" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
