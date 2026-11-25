import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { Icon, usePermissions, notificationsQuery, t } from '@ab/web-kit';

export interface MenuBellProps {
  open: boolean;
  onOpen: () => void;
}

/** Its name stays exactly the menu label; the unread count is its hidden description. */
export function MenuBell({ open, onOpen }: MenuBellProps) {
  const allowed = usePermissions().can('notifications.push');
  const unread = useQuery({ ...notificationsQuery, enabled: allowed }).data?.unread ?? 0;
  const countId = useId();
  const dot = allowed && unread > 0;
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={dot ? countId : undefined}
        onClick={onOpen}
        className="relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-rule-strong px-3 text-sm font-semibold text-ink hover:bg-sunk"
      >
        <Icon name="menu" />
        {t.nav.menu}
        {dot && (
          <span
            aria-hidden="true"
            data-testid="menu-dot"
            className="absolute -top-1 -end-1 size-2.5 rounded-full bg-act ring-2 ring-card"
          />
        )}
      </button>
      {dot && (
        <span id={countId} className="sr-only">
          {t.bell.menuUnread.replace('{n}', String(unread))}
        </span>
      )}
    </>
  );
}
