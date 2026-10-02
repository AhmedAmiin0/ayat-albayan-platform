import { Link } from '@tanstack/react-router';
import { Icon, type IconName } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// The teacher's top bar (R-TCH-03): only their own pages, the same order as the mobile tabs.
const ITEMS = [
  { to: '/teacher', label: t.teacherNav.today, icon: 'clock', exact: true },
  { to: '/teacher/calendar', label: t.teacherNav.calendar, icon: 'calendar', exact: false },
  { to: '/teacher/inbox', label: t.nav.conversations, icon: 'chat', exact: false },
  { to: '/teacher/reports', label: t.teacherNav.reports, icon: 'receipt', exact: false },
  { to: '/teacher/payouts', label: t.teacherNav.payouts, icon: 'wallet', exact: false },
] as const satisfies readonly { to: string; label: string; icon: IconName; exact: boolean }[];

/** One row of 48px links under the logo; it scrolls sideways on a phone (docs/07 §7). */
export function TeacherNav() {
  return (
    <nav aria-label={t.teacherNav.label} className="ab-fade-end -mx-1 overflow-x-auto px-1 pe-8 [scrollbar-width:none] sm:[mask-image:none]">
      <ul className="flex gap-1">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className={cn(
                'group flex min-h-12 items-center gap-2 whitespace-nowrap rounded-md px-3 font-medium text-ink-2 hover:bg-sunk hover:text-ink',
                'aria-[current=page]:bg-page aria-[current=page]:font-semibold aria-[current=page]:text-ink aria-[current=page]:shadow-[0_0_0_1px_var(--rule-strong)]',
              )}
            >
              <Icon name={item.icon} className="text-ink-3 group-aria-[current=page]:text-lapis" />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
