import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { Icon } from '@/components/ui/icon';
import { usePermissions } from '@/features/auth/use-permissions';
import { notificationsQuery } from '@/features/notifications/api';
import { t } from '@/lib/i18n';

export interface MenuBellProps {
  open: boolean;
  onOpen: () => void;
}

/**
 * The compact bar's ONE button «القائمة» (< 900px, owner 2026-10-05). For staff holding
 * notifications.push with something unread it carries a small saffron dot; its name stays exactly
 * «القائمة» and the count is its description (a visually hidden text). The bell itself is in the sheet.
 */
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
