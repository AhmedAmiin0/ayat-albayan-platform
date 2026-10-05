import type { Permission } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Icon, type IconName } from '@/components/ui/icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// The salesperson's three pages: chats, subscriptions, meetings.
const ITEMS = [
  { to: '/sales/inbox', label: t.sales.nav.chats, icon: 'chat', permission: 'inbox.read' },
  { to: '/sales/subscriptions', label: t.sales.nav.subscriptions, icon: 'receipt', permission: 'self.sales' },
  { to: '/sales/meetings', label: t.sales.nav.schedule, icon: 'calendar', permission: 'self.sales' },
] as const satisfies readonly { to: string; label: string; icon: IconName; permission: Permission }[];

/** A fixed bottom bar on phones (three 56px tabs, like TeacherNav), a row of links from sm up. */
export function SalesNav({ can = () => true }: { can?: (permission: Permission) => boolean }) {
  return (
    <nav
      aria-label={t.sales.nav.label}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-rule-strong bg-page pb-[env(safe-area-inset-bottom)] sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:pb-0"
    >
      <ul className="grid grid-cols-3 sm:flex sm:gap-1">
        {ITEMS.filter((item) => can(item.permission)).map((item) => (
          <li key={item.to} className="min-w-0">
            <Link
              to={item.to}
              className={cn(
                'group flex min-h-14 flex-col items-center justify-center gap-0.5 px-0.5 text-2xs font-medium text-ink-2 hover:text-ink',
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
