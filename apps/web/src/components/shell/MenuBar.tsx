import { Link, useRouterState } from '@tanstack/react-router';
import { useState, type MouseEvent, type ReactNode } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Mark } from '@/components/ui/mark';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { MenuFoot } from './MenuFoot';

export interface MenuBarProps {
  /** The section home the logo mark links to (/admin, /teacher, …). */
  home: string;
  /** The current page's title, shown next to the mark. */
  title: string;
  /** The section's nav (the same list the wide layout renders); none for one-page areas. */
  nav?: ReactNode;
  email?: string | null;
  className?: string;
}

/**
 * Phones and tablets (< 900px, owner 2026-10-05: "make it simpler"): ONE compact bar (logo mark,
 * the page title, the bell for staff, «القائمة»). The menu opens the full nav in the Dialog sheet
 * with theme, language and logout at its foot; following a link closes it. The title is a
 * pseudo-element: the page's own h1 names the page, the bar only echoes it (no second heading
 * or text node).
 */
export function MenuBar({ home, title, nav, email, className }: MenuBarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Open on the page it was opened on only: any navigation closes the sheet.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const close = () => setOpenOn(null);
  // A link to the page already shown changes no path: close on any link click in the sheet too.
  const onPick = (e: MouseEvent) => {
    if (e.target instanceof Element && e.target.closest('a')) close();
  };
  return (
    <header
      className={cn('flex min-h-14 shrink-0 items-center gap-2 border-b border-rule bg-card px-2 sm:rounded-b-md', className)}
    >
      <Link to={home} aria-label={t.app.name} className="grid size-11 shrink-0 place-items-center rounded-md">
        <Mark size={32} />
      </Link>
      <span
        aria-hidden="true"
        data-bar-title={title}
        className="min-w-0 flex-1 truncate text-base font-bold text-ink before:content-[attr(data-bar-title)]"
      />
      <NotificationBell />
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpenOn(pathname)}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-rule-strong px-3 text-sm font-semibold text-ink hover:bg-sunk"
      >
        <Icon name="menu" />
        {t.nav.menu}
      </button>
      {open && (
        <Dialog title={t.nav.menu} onClose={close}>
          <div onClickCapture={onPick}>
            {nav}
            <MenuFoot email={email} />
          </div>
        </Dialog>
      )}
    </header>
  );
}
