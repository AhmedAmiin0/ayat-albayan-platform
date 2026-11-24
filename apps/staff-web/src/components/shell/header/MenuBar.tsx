import { Link, useRouterState } from '@tanstack/react-router';
import { useState, type MouseEvent, type ReactNode } from 'react';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { Mark } from '@ab/web-kit/components/ui/display/mark';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { MenuBell } from './MenuBell';
import { MenuFoot } from '@/components/shell/account/MenuFoot';
import { SheetBell } from './SheetBell';

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

/** Below 900px one compact bar; its title is a pseudo-element so the page's h1 is the heading. */
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
      <MenuBell open={open} onOpen={() => setOpenOn(pathname)} />
      {open && (
        <Dialog title={t.nav.menu} onClose={close}>
          <div onClickCapture={onPick}>
            <SheetBell onPick={close} />
            {nav}
            <MenuFoot email={email} />
          </div>
        </Dialog>
      )}
    </header>
  );
}
